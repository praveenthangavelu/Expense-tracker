import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0F1117] p-6 text-center">
    <div className="absolute left-10 top-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />
    <div className="absolute bottom-16 right-10 h-64 w-64 rounded-full bg-red-400/10 blur-3xl" />
    <div className="relative">
      <h1 className="bg-gradient-to-r from-emerald-300 to-red-400 bg-clip-text font-display text-8xl font-extrabold text-transparent sm:text-9xl">
        404
      </h1>
      <p className="mt-4 font-display text-3xl font-bold text-white">
        This page doesn't exist
      </p>
      <p className="mt-3 text-slate-500">
        The route may have moved or never existed.
      </p>
      <Link
        to="/dashboard"
        className="mt-8 inline-flex rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 px-5 py-3 font-bold text-slate-950 shadow-glow"
      >
        Go Home
      </Link>
    </div>
  </div>
);

export default NotFound;
