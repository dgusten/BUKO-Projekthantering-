import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/meta";
import { createUser, deleteUser } from "@/app/actions";

export default async function AnvandarePage() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <>
      <div className="topbar">
        <h1>Användare</h1>
        <span className="crumb">BUKO Sverige / Användare</span>
      </div>
      <div className="content">
        <div className="content-inner">
          <div className="page-header">
            <div>
              <h2>Användare</h2>
              <p>Skapa och se konton för projektledare, TA-plansritare och administratörer.</p>
            </div>
          </div>

          <div className="card card-pad" style={{ maxWidth: 560, marginBottom: 24 }}>
            <h3 style={{ marginTop: 0 }}>Nytt konto</h3>
            <form action={createUser}>
              <div className="form-row">
                <div className="form-group">
                  <label>Namn</label>
                  <input type="text" name="name" placeholder="För- och efternamn" required />
                </div>
                <div className="form-group">
                  <label>Roll</label>
                  <select name="role" defaultValue="TA">
                    <option value="PL">Projektledare</option>
                    <option value="TA">TA-plansritare</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>E-post</label>
                <input type="email" name="email" placeholder="namn@buko.se" required />
              </div>
              <div className="form-group">
                <label>Tillfälligt lösenord</label>
                <input type="text" name="password" placeholder="Minst 8 tecken" required minLength={8} />
                <div className="hint">Skickas till användaren via e-post tillsammans med inloggningslänk.</div>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Skapa användare
                </button>
              </div>
            </form>
          </div>

          <div className="card card-pad">
            <div style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Namn</th>
                    <th>E-post</th>
                    <th>Roll</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <span className="avatar" style={{ marginRight: 8 }}>
                          {u.initials}
                        </span>
                        {u.name}
                      </td>
                      <td>{u.email}</td>
                      <td>{ROLE_LABEL[u.role]}</td>
                      <td style={{ textAlign: "right" }}>
                        {u.id !== user.id && (
                          <form action={deleteUser.bind(null, u.id)}>
                            <button type="submit" className="btn btn-sm btn-ghost" title="Ta bort">
                              ✕
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
