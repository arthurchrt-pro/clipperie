import type { Metadata } from "next";
import { connection } from "next/server";
import { Logo } from "@/components/Logo";
import { isStorageConfigured } from "@/engine/storage";
import { getStripe } from "@/lib/stripe";
import { supabasePublishableKey, supabaseUrl, supabaseUrlRaw } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { activatePendingPayments } from "./actions";

// Page temporaire de vérification de la configuration, à retirer après le lancement.
// Elle n'affiche aucune valeur secrète : seulement si chaque réglage est présent et fonctionne.
export const metadata: Metadata = {
  title: "Diagnostic",
  robots: { index: false },
};

type Check = { label: string; ok: boolean; detail: string };

function describeError(error: unknown) {
  if (error && typeof error === "object") {
    const e = error as { code?: string; type?: string; message?: string };
    return [e.code ?? e.type, e.message].filter(Boolean).join(" — ").slice(0, 200);
  }
  return String(error).slice(0, 200);
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // Stripe
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim() ?? "";
  checks.push({
    label: "Clé secrète Stripe",
    ok: /^sk_(test|live)_/.test(stripeKey),
    detail: !stripeKey
      ? "absente"
      : stripeKey.startsWith("sk_test_")
        ? "présente, mode test"
        : stripeKey.startsWith("sk_live_")
          ? "présente, mode réel"
          : `commence par « ${stripeKey.slice(0, 3)} » au lieu de sk_test_`,
  });
  const stripe = getStripe();
  if (stripe) {
    try {
      await stripe.prices.list({ limit: 1 });
      checks.push({ label: "Stripe répond", ok: true, detail: "connexion réussie" });
    } catch (error) {
      checks.push({ label: "Stripe répond", ok: false, detail: describeError(error) });
    }
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim() ?? "";
  checks.push({
    label: "Secret du webhook Stripe",
    ok: webhookSecret.startsWith("whsec_"),
    detail: !webhookSecret
      ? "absent"
      : webhookSecret.startsWith("whsec_")
        ? "présent"
        : "ne commence pas par whsec_",
  });

  // Moteur de découpe
  const triggerKey = process.env.TRIGGER_SECRET_KEY?.trim() ?? "";
  checks.push({
    label: "Clé du moteur Trigger.dev (TRIGGER_SECRET_KEY)",
    ok: triggerKey.startsWith("tr_prod_"),
    detail: !triggerKey
      ? "absente : les lives restent en file d’attente"
      : triggerKey.startsWith("tr_prod_")
        ? "présente, environnement Production"
        : triggerKey.startsWith("tr_dev_")
          ? "c’est la clé de Development : il faut celle de Production (tr_prod_)"
          : "format inattendu",
  });
  checks.push({
    label: "Stockage des clips (Cloudflare R2)",
    ok: isStorageConfigured(),
    detail: isStorageConfigured()
      ? "configuré"
      : "pas encore configuré (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET)",
  });

  // Supabase : réglages
  const url = supabaseUrl();
  const rawUrl = supabaseUrlRaw();
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url);
  checks.push({
    label: "Adresse Supabase (NEXT_PUBLIC_SUPABASE_URL)",
    ok: urlOk,
    detail: !url
      ? "absente"
      : !urlOk
        ? `format inattendu : « ${rawUrl.slice(0, 60)} » (attendu https://xxxx.supabase.co)`
        : rawUrl.replace(/\/$/, "") !== url
          ? `au bon format (le chemin en trop « ${rawUrl.slice(url.length)} » est ignoré)`
          : "au bon format",
  });
  const publishable = supabasePublishableKey();
  checks.push({
    label: "Clé publique Supabase (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)",
    ok: publishable.startsWith("sb_publishable_") || publishable.startsWith("eyJ"),
    detail: !publishable
      ? "absente"
      : publishable.startsWith("sb_secret_")
        ? "c’est la clé secrète : il faut la clé publique ici"
        : publishable.startsWith("sb_publishable_") || publishable.startsWith("eyJ")
          ? "présente"
          : "format inattendu",
  });
  const secret = process.env.SUPABASE_SECRET_KEY?.trim() ?? "";
  const secretOk = secret.startsWith("sb_secret_") || secret.startsWith("eyJ");
  checks.push({
    label: "Clé secrète Supabase (SUPABASE_SECRET_KEY)",
    ok: secretOk,
    detail: !secret
      ? "absente"
      : secret.startsWith("sb_publishable_")
        ? "c’est la clé publique : il faut la clé secrète ici"
        : secretOk
          ? "présente"
          : "format inattendu",
  });

  // Supabase : la base et les comptes
  if (urlOk && secretOk) {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    checks.push({
      label: "Base de données (tables créées par le script SQL)",
      ok: !error,
      detail: error ? describeError(error) : `${count ?? 0} profil(s) client`,
    });
    const { data: users, error: usersError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    checks.push({
      label: "Comptes Supabase",
      ok: !usersError,
      detail: usersError ? describeError(usersError) : `${users.users.length} compte(s)`,
    });

    // Les derniers paiements ont-ils été activés par le webhook ?
    if (stripe && !error) {
      try {
        const { data: sessions } = await stripe.checkout.sessions.list({ limit: 10 });
        const paid = sessions.filter((s) => s.status === "complete");
        const { data: activated } = await admin
          .from("subscriptions")
          .select("checkout_session_id")
          .in("checkout_session_id", paid.map((s) => s.id));
        const done = activated?.length ?? 0;
        checks.push({
          label: "Paiements récents activés par le webhook",
          ok: paid.length === 0 || done > 0,
          detail: `${done} activé(s) sur ${paid.length} paiement(s) récent(s)`,
        });
      } catch (err) {
        checks.push({
          label: "Paiements récents activés par le webhook",
          ok: false,
          detail: describeError(err),
        });
      }
    }
  }

  return checks;
}

export default async function Diagnostic({ searchParams }: PageProps<"/diagnostic">) {
  await connection();
  const checks = await runChecks();
  const { resultat } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Logo />
      <h1 className="mt-8 font-display text-3xl font-extrabold">Diagnostic</h1>
      <p className="mt-2 text-encre-douce">
        Aucune valeur secrète n’est affichée ici.
      </p>
      <ul className="mt-6 space-y-3">
        {checks.map((check) => (
          <li
            key={check.label}
            className={`rounded-2xl border-2 p-4 ${check.ok ? "border-encre/20 bg-papier" : "border-rec bg-papier"}`}
          >
            <p className="font-semibold">
              <span aria-hidden className={check.ok ? "text-encre" : "text-rec"}>
                {check.ok ? "✓" : "✗"}
              </span>{" "}
              {check.label}
            </p>
            <p className="mt-1 text-sm break-words text-encre-douce">{check.detail}</p>
          </li>
        ))}
      </ul>

      <section className="mt-8 rounded-2xl border-2 border-dashed border-encre/25 p-4">
        <h2 className="font-display text-xl font-extrabold">
          Activer les paiements en attente
        </h2>
        <p className="mt-1 text-sm text-encre-douce">
          Refait, pour les derniers paiements de test non activés, ce que fait le
          webhook, et affiche l’erreur précise s’il y en a une.
        </p>
        {typeof resultat === "string" && (
          <p
            role="status"
            className="mt-3 rounded-xl bg-surligneur px-3 py-2 text-sm font-semibold break-words"
          >
            {resultat}
          </p>
        )}
        <form action={activatePendingPayments} className="mt-4">
          <SubmitButton pendingLabel="Activation en cours…">
            Activer les paiements en attente
          </SubmitButton>
        </form>
      </section>
    </main>
  );
}
