import { Navigate, Route, Routes } from "react-router";
import { authRoutes, publicRoutes } from "./router.link";
import Feature from "./feature";
import AuthFeature from "./authFeature";

const ALLRoutes: React.FC = () => {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<Feature />}>
          {publicRoutes.filter(r => r.path !== "/").map((route, idx) => (
            <Route path={route.path} element={route.element} key={idx} />
          ))}
        </Route>

        <Route element={<AuthFeature />}>
          {authRoutes.map((route, idx) => (
            <Route path={route.path} element={route.element} key={idx} />
          ))}
        </Route>
      </Routes>
    </>
  );
};

export default ALLRoutes;
