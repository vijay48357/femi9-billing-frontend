import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { resetTheme, updateTheme } from "../../core/redux/themeSlice";
import ImageWithBasePath from "../imageWithBasePath";

const ThemeSettings = () => {
  const dispatch = useDispatch();
  const themeSettings = useSelector((state: any) => state.theme.themeSettings);

  useEffect(() => {
    const htmlElement: any = document.documentElement;
    Object.entries(themeSettings).forEach(([key, value]) => {
      htmlElement.setAttribute(key, value);
    });
  }, [themeSettings]);

  const handleUpdateTheme = (key: string, value: string) => {
    if (themeSettings["dir"] === "rtl" && key !== "dir") {
      dispatch(updateTheme({ dir: "ltr" }));
    }
    dispatch(updateTheme({ [key]: value }));
  };

  const handleResetTheme = () => {
    dispatch(resetTheme());
  };

  return (
    <>
      <div className="sidebar-contact">
        <div
          className="toggle-theme"
          data-bs-toggle="offcanvas"
          data-bs-target="#theme-settings-offcanvas"
        >
          <i className="ti ti-settings" />
        </div>
      </div>
      <div
        className="sidebar-themesettings offcanvas offcanvas-end"
        tabIndex={-1}
        id="theme-settings-offcanvas"
      >
        <div className="d-flex align-items-center gap-2 px-3 py-3 offcanvas-header border-bottom bg-primary">
          <h5 className="flex-grow-1 mb-0">Theme Customizer</h5>
          <button
            type="button"
            className="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body h-100" data-simplebar="">
          <div className="accordion accordion-bordered">

            {/* ===================== COLOR MODE ===================== */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-semibold fs-16"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#modesetting"
                  aria-expanded="true"
                >
                  Color Mode
                </button>
              </h2>
              <div id="modesetting" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <div className="form-check card-radio" onClick={() => handleUpdateTheme("data-bs-theme", "light")}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="data-bs-theme"
                          id="layout-color-light"
                          value="light"
                          checked={themeSettings["data-bs-theme"] === "light"}
                          onChange={(e) => handleUpdateTheme("data-bs-theme", e.target.value)}
                        />
                        <label className="form-check-label p-2 w-100 d-flex justify-content-center align-items-center" htmlFor="layout-color-light">
                          <i className="ti ti-sun me-1" /> Light
                        </label>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="form-check card-radio" onClick={() => handleUpdateTheme("data-bs-theme", "dark")}>
                        <input
                          className="form-check-input"
                          type="radio"
                          name="data-bs-theme"
                          id="layout-color-dark"
                          value="dark"
                          checked={themeSettings["data-bs-theme"] === "dark"}
                          onChange={(e) => handleUpdateTheme("data-bs-theme", e.target.value)}
                        />
                        <label className="form-check-label p-2 w-100 d-flex justify-content-center align-items-center" htmlFor="layout-color-dark">
                          <i className="ti ti-moon me-1" /> Dark
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================== SELECT LAYOUTS ===================== */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-semibold fs-16"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#layoutsetting"
                  aria-expanded="true"
                >
                  Select Layouts
                </button>
              </h2>
              <div id="layoutsetting" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <div className="theme-content">
                    <div className="row g-3">
                      <div className="col-4">
                        <div className="theme-layout" onClick={() => handleUpdateTheme("data-layout", "default")}>
                          <input
                            type="radio"
                            name="data-layout"
                            id="defaultLayout"
                            value="default"
                            checked={themeSettings["data-layout"] === "default"}
                            onChange={(e) => handleUpdateTheme("data-layout", e.target.value)}
                          />
                          <label htmlFor="defaultLayout">
                            <span className="d-block mb-2 layout-img">
                              <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                              <ImageWithBasePath src="assets/img/theme/default.svg" alt="img" />
                            </span>
                            <span className="layout-type">Default</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="theme-layout" onClick={() => handleUpdateTheme("data-layout", "mini")}>
                          <input
                            type="radio"
                            name="data-layout"
                            id="miniLayout"
                            value="mini"
                            checked={themeSettings["data-layout"] === "mini"}
                            onChange={(e) => handleUpdateTheme("data-layout", e.target.value)}
                          />
                          <label htmlFor="miniLayout">
                            <span className="d-block mb-2 layout-img">
                              <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                              <ImageWithBasePath src="assets/img/theme/mini.svg" alt="img" />
                            </span>
                            <span className="layout-type">Mini</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="theme-layout" onClick={() => handleUpdateTheme("data-layout", "hoverview")}>
                          <input
                            type="radio"
                            name="data-layout"
                            id="hoverviewLayout"
                            value="hoverview"
                            checked={themeSettings["data-layout"] === "hoverview"}
                            onChange={(e) => handleUpdateTheme("data-layout", e.target.value)}
                          />
                          <label htmlFor="hoverviewLayout">
                            <span className="d-block mb-2 layout-img">
                              <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                              <ImageWithBasePath src="assets/img/theme/mini.svg" alt="img" />
                            </span>
                            <span className="layout-type">Hover View</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="theme-layout" onClick={() => handleUpdateTheme("data-layout", "hidden")}>
                          <input
                            type="radio"
                            name="data-layout"
                            id="hiddenLayout"
                            value="hidden"
                            checked={themeSettings["data-layout"] === "hidden"}
                            onChange={(e) => handleUpdateTheme("data-layout", e.target.value)}
                          />
                          <label htmlFor="hiddenLayout">
                            <span className="d-block mb-2 layout-img">
                              <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                              <ImageWithBasePath src="assets/img/theme/full-width.svg" alt="img" />
                            </span>
                            <span className="layout-type">Hidden</span>
                          </label>
                        </div>
                      </div>
                      <div className="col-4">
                        <div className="theme-layout" onClick={() => handleUpdateTheme("data-layout", "full-width")}>
                          <input
                            type="radio"
                            name="data-layout"
                            id="full-widthLayout"
                            value="full-width"
                            checked={themeSettings["data-layout"] === "full-width"}
                            onChange={(e) => handleUpdateTheme("data-layout", e.target.value)}
                          />
                          <label htmlFor="full-widthLayout">
                            <span className="d-block mb-2 layout-img">
                              <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                              <ImageWithBasePath src="assets/img/theme/full-width.svg" alt="img" />
                            </span>
                            <span className="layout-type">Full Width</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================== SIDEBAR COLOR ===================== */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-semibold fs-16"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#sidebarcolorsetting"
                  aria-expanded="true"
                >
                  Sidebar Color
                </button>
              </h2>
              <div id="sidebarcolorsetting" className="accordion-collapse collapse show">
                <div className="accordion-body">
                  <div className="theme-content">
                    <h6 className="fs-14 fw-medium mb-2">Solid Colors</h6>
                    <div className="d-flex align-items-center flex-wrap mb-1">
                      {[
                        { value: "light", className: "" },
                        { value: "sidebar2", className: "bg-light" },
                        { value: "sidebar3", className: "bg-dark" },
                        { value: "sidebar4", className: "bg-primary" },
                        { value: "sidebar5", className: "bg-secondary" },
                        { value: "sidebar6", className: "bg-info" },
                        { value: "sidebar7", className: "bg-indigo" },
                      ].map((item) => (
                        <div key={item.value} className="theme-colorselect m-1 me-2" onClick={() => handleUpdateTheme("data-sidebar", item.value)}>
                          <input
                            type="radio"
                            name="data-sidebar"
                            id={`${item.value}Sidebar`}
                            value={item.value}
                            checked={themeSettings["data-sidebar"] === item.value}
                            onChange={(e) => handleUpdateTheme("data-sidebar", e.target.value)}
                          />
                          <label htmlFor={`${item.value}Sidebar`} className={`d-block rounded mb-2 ${item.className}`}>
                            <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                          </label>
                        </div>
                      ))}
                    </div>

                    <h6 className="fs-14 fw-medium mb-2">Gradient Colors</h6>
                    <div className="d-flex align-items-center flex-wrap">
                      {[
                        { value: "gradientsidebar1", className: "bg-indigo-gradient" },
                        { value: "gradientsidebar2", className: "bg-primary-gradient" },
                        { value: "gradientsidebar3", className: "bg-secondary-gradient" },
                        { value: "gradientsidebar4", className: "bg-dark-gradient" },
                        { value: "gradientsidebar5", className: "bg-purple-gradient" },
                        { value: "gradientsidebar6", className: "bg-orange-gradient" },
                        { value: "gradientsidebar7", className: "bg-info-gradient" },
                      ].map((item) => (
                        <div key={item.value} className="theme-colorselect m-1 me-2" onClick={() => handleUpdateTheme("data-sidebar", item.value)}>
                          <input
                            type="radio"
                            name="data-sidebar"
                            id={`${item.value}Sidebar`}
                            value={item.value}
                            checked={themeSettings["data-sidebar"] === item.value}
                            onChange={(e) => handleUpdateTheme("data-sidebar", e.target.value)} // ✅ Fixed
                          />
                          <label htmlFor={`${item.value}Sidebar`} className={`d-block rounded ${item.className}`}>
                            <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================== TOP BAR COLOR ===================== */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-semibold fs-16"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#colorsetting"
                  aria-expanded="true"
                >
                  Top Bar Color
                </button>
              </h2>
              <div id="colorsetting" className="accordion-collapse collapse show">
                <div className="accordion-body pb-1">
                  <div className="theme-content">
                    <h6 className="fs-14 fw-medium mb-2">Solid Colors</h6>
                    <div className="d-flex align-items-center flex-wrap topbar-background mb-1">
                      {[
                        { value: "white", className: "white-topbar" },
                        { value: "topbar1", className: "bg-light" },
                        { value: "topbar2", className: "bg-dark" },
                        { value: "topbar3", className: "bg-primary" },
                        { value: "topbar4", className: "bg-secondary" },
                        { value: "topbar5", className: "bg-info" },
                        { value: "topbar6", className: "bg-indigo" },
                      ].map((item) => (
                        <div key={item.value} className="theme-colorselect mb-3 me-3" onClick={() => handleUpdateTheme("data-topbar", item.value)}>
                          <input
                            type="radio"
                            name="data-topbar"
                            id={`${item.value}Topbar`}
                            value={item.value}
                            checked={themeSettings["data-topbar"] === item.value}
                            onChange={(e) => handleUpdateTheme("data-topbar", e.target.value)}
                          />
                          <label htmlFor={`${item.value}Topbar`} className={item.className}>
                            <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                          </label>
                        </div>
                      ))}
                    </div>

                    <h6 className="fs-14 fw-medium mb-2">Gradient Colors</h6>
                    <div className="d-flex align-items-center flex-wrap topbar-background">
                      {[
                        { value: "gradienttopbar1", className: "bg-indigo-gradient" },
                        { value: "gradienttopbar2", className: "bg-primary-gradient" },
                        { value: "gradienttopbar3", className: "bg-secondary-gradient" },
                        { value: "gradienttopbar4", className: "bg-dark-gradient" },
                        { value: "gradienttopbar5", className: "bg-purple-gradient" },
                        { value: "gradienttopbar6", className: "bg-orange-gradient" },
                        { value: "gradienttopbar7", className: "bg-info-gradient" },
                      ].map((item) => (
                        <div key={item.value} className="theme-colorselect mb-3 me-3" onClick={() => handleUpdateTheme("data-topbar", item.value)}>
                          <input
                            type="radio"
                            name="data-topbar"
                            id={`${item.value}Topbar`}
                            value={item.value}
                            checked={themeSettings["data-topbar"] === item.value}
                            onChange={(e) => handleUpdateTheme("data-topbar", e.target.value)}
                          />
                          <label htmlFor={`${item.value}Topbar`} className={item.className}>
                            <span className="theme-check rounded-circle"><i className="ti ti-check" /></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ===================== THEME COLORS ===================== */}
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button fw-semibold fs-16"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#sidebarcolor"
                  aria-expanded="true"
                >
                  Theme Colors
                </button>
              </h2>
              <div id="sidebarcolor" className="accordion-collapse collapse show">
                <div className="accordion-body pb-2">
                  <div className="theme-content">
                    <div className="d-flex align-items-center flex-wrap">
                      {[
                        { value: "primary", className: "primary-clr" },
                        { value: "secondary", className: "secondary-clr" },
                        { value: "orange", className: "orange-clr" },
                        { value: "teal", className: "teal-clr" },
                        { value: "purple", className: "purple-clr" },
                        { value: "indigo", className: "indigo-clr" },
                        { value: "info", className: "info-clr" },
                      ].map((item) => (
                        <div key={item.value} className="theme-colorsset me-2 mb-2" onClick={() => handleUpdateTheme("data-color", item.value)}>
                          <input
                            type="radio"
                            name="data-color"
                            id={`${item.value}Color`}
                            value={item.value}
                            checked={themeSettings["data-color"] === item.value}
                            onChange={(e) => handleUpdateTheme("data-color", e.target.value)}
                          />
                          <label htmlFor={`${item.value}Color`} className={item.className} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="d-flex align-items-center gap-2 px-3 py-2 offcanvas-header border-top">
          <button
            type="button"
            className="btn w-50 btn-light"
            id="reset-layout"
            onClick={handleResetTheme}
          >
            <i className="ti ti-restore me-1" />
            Reset
          </button>
          <button type="button" className="btn w-50 btn-primary">
            Buy Product
          </button>
        </div>
      </div>
    </>
  );
};

export default ThemeSettings;
