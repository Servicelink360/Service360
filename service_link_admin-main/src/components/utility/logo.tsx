import React from "react";
import { Link } from "react-router-dom";
import servicelinkLogo from "@app/assets/images/signin/servicelink-logo.png";

export default ({ collapsed, mobileDrawer }: { collapsed?: boolean; mobileDrawer?: boolean }) => {
  const logoWidth = mobileDrawer ? 68 : 135;
  const logoHeight = mobileDrawer ? 42 : 83;

  return (
    <div className={`logo${mobileDrawer ? " logo--mobile-drawer" : ""}`}>
      {collapsed ? (
        ""
      ) : (
        <Link to="/dashboard">
          <img
            src={servicelinkLogo}
            className="logo__main"
            alt="ServiceLink — Your partner in facilities"
            width={logoWidth}
            height={logoHeight}
            style={
              mobileDrawer
                ? {
                    width: logoWidth,
                    maxWidth: logoWidth,
                    height: "auto",
                    maxHeight: logoHeight,
                    display: "block",
                    objectFit: "contain",
                  }
                : undefined
            }
          />
        </Link>
      )}
    </div>
  );
};
