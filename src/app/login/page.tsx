import { login } from "@/app/actions";

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const hasError = searchParams.error === "1";

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <img src="/logo.png" alt="BUKO Sverige" className="login-logo" />
        </div>
        <h1>Ärendehantering – TA-planer</h1>
        <p className="subtitle">Logga in med din e-postadress och ditt lösenord.</p>

        {hasError && (
          <div className="hint" style={{ color: "var(--danger)", marginBottom: 16 }}>
            Fel e-post eller lösenord. Försök igen.
          </div>
        )}

        <form action={login}>
          <div className="form-group">
            <label>E-post</label>
            <input type="email" name="email" placeholder="namn@buko.se" required autoFocus />
          </div>
          <div className="form-group">
            <label>Lösenord</label>
            <input type="password" name="password" placeholder="••••••••" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block">
            Logga in
          </button>
        </form>

        <div className="login-footnote">Kontakta din administratör om du saknar inloggningsuppgifter.</div>
      </div>
    </div>
  );
}
