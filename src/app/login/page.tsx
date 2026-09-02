import { prisma } from "@/lib/prisma";
import { ROLE_LABEL } from "@/lib/meta";
import { loginAs } from "@/app/actions";

const GROUPS = ["ADMIN", "PL", "TA"] as const;

export default async function LoginPage() {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-brand">
          <span className="logo-mark">BK</span>
          <strong>BUKO Sverige</strong>
        </div>
        <h1>Ärendehantering – TA-planer</h1>
        <p className="subtitle">
          Tillfällig inloggning i väntan på Microsoft-inloggning – välj en användare för att fortsätta.
        </p>

        {GROUPS.map((role) => {
          const group = users.filter((u) => u.role === role);
          if (group.length === 0) return null;
          return (
            <div className="user-pick-group" key={role}>
              <h2>{ROLE_LABEL[role]}</h2>
              {group.map((u) => (
                <form action={loginAs} key={u.id}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button type="submit" className="user-pick">
                    <span className="avatar">{u.initials}</span>
                    <span>
                      <div className="user-pick-name">{u.name}</div>
                      <div className="user-pick-role">{ROLE_LABEL[u.role]}</div>
                    </span>
                  </button>
                </form>
              ))}
            </div>
          );
        })}

        <div className="login-footnote">
          Riktig inloggning med era Microsoft-konton kopplas in i nästa steg.
        </div>
      </div>
    </div>
  );
}
