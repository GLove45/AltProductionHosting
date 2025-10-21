const LoginPage = () => {
  return (
    <section className="auth-page">
      <h1>Login</h1>
      <p>Authenticate to manage your domains, hosting spaces, and editor drafts.</p>
      <form>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="••••••••" />
        </label>
        <button type="submit">Sign in</button>
      </form>
    </section>
  );
};

export default LoginPage;
