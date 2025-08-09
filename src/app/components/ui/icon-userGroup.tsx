import * as React from "react"

export const UsersGroupIcon = ({ className }: { className?: string }) => {
  return (
    <div
      className={className}
      style={{
        width: 24,
        height: 24,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Left Circle */}
      <div
        style={{
          width: 7,
          height: 7,
          borderRadius: "50%",
          position: "absolute",
          left: 8.5,
          top: 4,
          backgroundColor: "#28C283",
        }}
      />

      {/* Top Right Circle (opacity 50%) */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          position: "absolute",
          left: 14.5,
          top: 5,
          backgroundColor: "#28C283",
          opacity: 0.5,
        }}
      />

      {/* Lower Left Circle (opacity 50%) */}
      <div
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          position: "absolute",
          left: 9.5,
          top: 10,
          backgroundColor: "#28C283",
          transform: "rotate(180deg)",
          transformOrigin: "top left",
          opacity: 0.5,
        }}
      />

      {/* Main Base Shape */}
      <div
        style={{
          width: 12,
          height: 7,
          borderRadius: 4,
          position: "absolute",
          left: 6,
          top: 13,
          backgroundColor: "#28C283",
        }}
      />

      {/* Lower Right Shape 1 (opacity 50%) */}
      <div
        style={{
          width: 8,
          height: 5,
          borderRadius: 4,
          position: "absolute",
          left: 14,
          top: 14,
          backgroundColor: "#28C283",
          opacity: 0.5,
        }}
      />

      {/* Lower Right Shape 2 (opacity 50%) */}
      <div
        style={{
          width: 8,
          height: 5,
          borderRadius: 4,
          position: "absolute",
          left: 10,
          top: 19,
          backgroundColor: "#28C283",
          transform: "rotate(180deg)",
          transformOrigin: "top left",
          opacity: 0.5,
        }}
      />
    </div>
  )
}
