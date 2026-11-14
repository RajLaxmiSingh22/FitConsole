import { useReveal } from "../hooks/useReveal.js";

// Fades its content up when scrolled into view. `index` staggers items in a grid by 100ms each.
export default function Reveal({ as: Tag = "div", index = 0, className = "", style, children, ...props }) {
  const [ref, shown] = useReveal();
  return <Tag ref={ref} className={`reveal ${shown ? "is-shown" : ""} ${className}`.trim()} style={{ ...style, "--reveal-delay": `${index * 100}ms` }} {...props}>{children}</Tag>;
}
