import { useDispatch, useSelector } from "react-redux";
import ImageWithBasePath from "../imageWithBasePath";
import { updateTheme } from "../../core/redux/themeSlice";
import { useEffect, useRef, useState } from "react";
import { setExpandMenu, setMobileSidebar } from "../../core/redux/sidebarSlice";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { OverlayScrollbarsComponent } from "overlayscrollbars-react";
import "overlayscrollbars/overlayscrollbars.css";
import { SidebarData } from "./sidebarData";
import React from "react";
import { all_routes } from "../../routes/all_routes";

const Sidebar = () => {
  const route = all_routes;
  const Location = useLocation();
  const pathname = Location.pathname;

  const [subsidebar, setSubsidebar] = useState("");
  const [openMenus, setOpenMenus] = useState<{ [label: string]: boolean }>({});

  // ✅ Saves menus opened by clicking — persists across mouse enter/leave
  const persistentMenusRef = useRef<{ [label: string]: boolean }>({});

  const dispatch = useDispatch();
  const themeSettings = useSelector((state: any) => state.theme.themeSettings);
  const navigate = useNavigate();

  // ─── Helper: check if a menu item matches current path ─────────────────
  const checkIfActive = (menuItem: any, currentPath: string): boolean => {
    if (menuItem.link === currentPath) return true;
    if (menuItem.relatedRoutes?.includes(currentPath)) return true;
    if (menuItem.submenuItems?.length) {
      return menuItem.submenuItems.some((item: any) =>
        item.link === currentPath ||
        item.relatedRoutes?.includes(currentPath) ||
        item.submenuItems?.some(
          (sub: any) =>
            sub.link === currentPath ||
            sub.relatedRoutes?.includes(currentPath)
        )
      );
    }
    return false;
  };

  // ─── Auto-open menus for active route ──────────────────────────────────
  useEffect(() => {
    const newOpenMenus: { [label: string]: boolean } = {};
    SidebarData.forEach((section) => {
      section.submenuItems?.forEach((title: any) => {
        // Only track items that have actual submenus (not flat links)
        if (title.submenu === true && checkIfActive(title, pathname)) {
          newOpenMenus[title.label] = true;
        }
      });
    });
    // Only preserve persistent state for submenu parents (not flat links)
    const allItems: any[] = SidebarData.flatMap(s => (s.submenuItems as any[]) ?? []);
    const cleanedPersistent: { [label: string]: boolean } = {};
    Object.keys(persistentMenusRef.current).forEach((label) => {
      const item = allItems.find((t: any) => t.label === label);
      if (item?.submenu === true) {
        cleanedPersistent[label] = persistentMenusRef.current[label];
      }
    });
    const merged = { ...cleanedPersistent, ...newOpenMenus };
    persistentMenusRef.current = merged;
    setOpenMenus(merged);
  }, [pathname]);

  // ─── Click: toggle menu, save into persistent ref ──────────────────────
  const handleMenuClick = (label: string) => {
    setOpenMenus((prev) => {
      const updated = { ...prev, [label]: !prev[label] };
      persistentMenusRef.current = updated;
      return updated;
    });
  };

  // ─── Sidebar mouse ENTER: restore persistent (clicked) menus ───────────
  const onSidebarMouseEnter = () => {
    dispatch(setExpandMenu(true));
    if (themeSettings["data-layout"] === "mini") {
      setOpenMenus({ ...persistentMenusRef.current });
    }
  };

  // ─── Sidebar mouse LEAVE: collapse all (persistent ref unchanged) ───────
  const onSidebarMouseLeave = () => {
    dispatch(setExpandMenu(false));
    if (themeSettings["data-layout"] === "mini") {
      setOpenMenus({});
      setSubsidebar("");
    }
  };

  const toggleSubsidebar = (label: string) => {
    setSubsidebar((prev) => (prev === label ? "" : label));
  };

  const handleMiniSidebar = () => {
    const rootElement = document.documentElement;
    const isMini = rootElement.getAttribute("data-layout") === "mini";
    dispatch(updateTheme({ "data-layout": isMini ? "default" : "mini" }));
    rootElement.classList.toggle("mini-sidebar", !isMini);
  };

  const handleLayoutClick = (layout: string) => {
    const layoutSettings: any = { "data-layout": "default", dir: "ltr" };
    switch (layout) {
      case "Hidden": layoutSettings["data-layout"] = "hidden"; break;
      case "Mini": layoutSettings["data-layout"] = "mini"; break;
      case "Hover View": layoutSettings["data-layout"] = "hoverview"; break;
      case "Full Width": layoutSettings["data-layout"] = "full-width"; break;
      case "Dark": layoutSettings["data-bs-theme"] = "dark"; break;
      case "RTL": layoutSettings.dir = "rtl"; break;
      default: break;
    }
    dispatch(updateTheme(layoutSettings));
    navigate("/dashboard");
  };

  const mobileSidebar = useSelector((state: any) => state.sidebarSlice.mobileSidebar);
  const toggleMobileSidebar = () => dispatch(setMobileSidebar(!mobileSidebar));

  useEffect(() => {
    const rootElement: any = document.documentElement;
    Object.entries(themeSettings).forEach(([key, value]) => {
      rootElement.setAttribute(key, value);
    });
    if (themeSettings["data-layout"] === "mini") {
      rootElement.classList.add("mini-sidebar");
    } else {
      rootElement.classList.remove("mini-sidebar");
    }
  }, [themeSettings]);

  return (
    <>
      <div
        className="sidebar"
        id="sidebar"
        onMouseEnter={onSidebarMouseEnter}
        onMouseLeave={onSidebarMouseLeave}
      >
        {/* ── Logo ── */}
        <div className="sidebar-logo">
          <div>
            <Link to={route.dealsDashboard} className="logo logo-normal">
              <ImageWithBasePath src="assets/img/logo.svg" alt="Logo" />
            </Link>
            <Link to={route.dealsDashboard} className="logo-small">
              <ImageWithBasePath src="assets/img/logo-small.svg" alt="Logo" />
            </Link>
            <Link to={route.dealsDashboard} className="dark-logo">
              <ImageWithBasePath src="assets/img/logo-white.svg" alt="Logo" />
            </Link>
          </div>
          <button
            className="sidenav-toggle-btn btn border-0 p-0 active"
            id="toggle_btn"
            onClick={handleMiniSidebar}
          >
            <i className="ti ti-arrow-bar-to-left" />
          </button>
          <button className="sidebar-close" onClick={toggleMobileSidebar}>
            <i className="ti ti-x align-middle" />
          </button>
        </div>

        {/* ── Menu ── */}
        <div className="sidebar-inner" data-simplebar="">
          <OverlayScrollbarsComponent style={{ height: "100%", width: "100%" }}>
            <div id="sidebar-menu" className="sidebar-menu">
              <ul>
                {SidebarData?.map((section, index) => (
                  <React.Fragment key={`section-${index}`}>
                    <li className="menu-title">
                      <span>{section?.title}</span>
                    </li>
                    <li>
                      <ul>
                        {section?.submenuItems?.map((title: any, i: number) => {
                          const isActive = checkIfActive(title, Location.pathname);
                          const isMenuOpen = openMenus[title?.label] || false;

                          return (
                            <li className="submenu" key={`title-${i}`}>
                              <Link
                                to={title?.submenu ? "#" : title?.link}
                                onClick={() => {
                                  if (title?.submenu) handleMenuClick(title?.label);
                                  if (section?.title === "Layout") handleLayoutClick(title?.label);
                                }}
                                className={`${isActive ? "active" : ""} ${isMenuOpen ? "subdrop" : ""}`}
                              >
                                <i className={`ti ti-${title.icon}`} />
                                <span>{title?.label}</span>
                                {(title?.submenu || title?.customSubmenuTwo) && (
                                  <span className="menu-arrow" />
                                )}
                              </Link>

                              {/* ── Level-2 submenu ── */}
                              {title?.submenu !== false && (
                                <ul style={{ display: isMenuOpen ? "block" : "none" }}>
                                  {title?.submenuItems?.map((item: any, j: number) => {
                                    const isSubActive =
                                      item?.submenuItems?.map((l: any) => l?.link).includes(Location.pathname) ||
                                      item?.link === Location.pathname ||
                                      item?.relatedRoutes?.includes(Location.pathname);

                                    return (
                                      <li
                                        className={item?.submenuItems?.length ? "submenu submenu-two" : ""}
                                        key={`item-${j}`}
                                      >
                                        <Link
                                          to={item?.submenu ? "#" : item?.link}
                                          className={`${isSubActive ? "active subdrop" : ""} ${subsidebar === item?.label ? "subdrop" : ""}`}
                                          onClick={() => {
                                            if (item?.submenu) toggleSubsidebar(item?.label);
                                            if (title?.label === "Layouts") handleLayoutClick(item?.label);
                                          }}
                                        >
                                          {item?.label}
                                          {(item?.submenu || item?.customSubmenuTwo) && (
                                            <span className="menu-arrow" />
                                          )}
                                        </Link>

                                        {/* ── Level-3 submenu ── */}
                                        {item?.submenuItems?.length ? (
                                          <ul style={{ display: subsidebar === item?.label ? "block" : "none" }}>
                                            {item?.submenuItems?.map((subItem: any, k: number) => {
                                              const isSubSubActive =
                                                subItem?.link === Location.pathname ||
                                                subItem?.relatedRoutes?.includes(Location.pathname);
                                              return (
                                                <li key={`subitem-${k}`}>
                                                  <Link
                                                    to={subItem?.submenu ? "#" : subItem?.link}
                                                    className={isSubSubActive ? "active" : ""}
                                                  >
                                                    {subItem?.label}
                                                  </Link>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        ) : null}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  </React.Fragment>
                ))}
              </ul>
            </div>
          </OverlayScrollbarsComponent>
        </div>
      </div>
    </>
  );
};

export default Sidebar;