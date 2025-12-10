const RegisterPage = () => {
  return (
    <section className="auth-page">
      <h1>Create your account</h1>
      <p>Select a hosting plan and allocate storage limits for your projects.</p>
      <form>
        <label>
          Username
          <input type="text" name="username" placeholder="choose a handle" />
        </label>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="••••••••" />
        </label>
        <label>
          Plan
          <select name="plan">
            <option value="starter">Starter (5 GB)</option>
            <option value="professional">Professional (50 GB)</option>
            <option value="enterprise">Enterprise (250 GB)</option>
          </select>
        </label>
        <button type="submit">Create account</button>
      </form>
    </section>
  );
};

export default RegisterPage;
