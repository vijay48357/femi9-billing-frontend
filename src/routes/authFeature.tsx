
import { Suspense } from "react";
import { Outlet } from "react-router";

const AuthFeature = () => {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    }>
      <Outlet />
    </Suspense>
  );
};

export default AuthFeature;
