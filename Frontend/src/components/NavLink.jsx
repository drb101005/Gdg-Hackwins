import { NavLink as RouterNavLink } from "react-router-dom";
import { forwardRef } from "react";

const NavLink = forwardRef(
  ({ className, activeClassName, pendingClassName, to, ...props }, ref) => {
    return (
      <RouterNavLink
        ref={ref}
        to={to}
        className={({ isActive, isPending }) => {
          // Standard JS to combine classes (No 'cn' utility needed)
          let finalClass = className || "";
          
          if (isActive && activeClassName) {
            finalClass += ` ${activeClassName}`;
          }
          
          if (isPending && pendingClassName) {
            finalClass += ` ${pendingClassName}`;
          }
          
          return finalClass.trim();
        }}
        {...props}
      />
    );
  }
);

NavLink.displayName = "NavLink";

export { NavLink };