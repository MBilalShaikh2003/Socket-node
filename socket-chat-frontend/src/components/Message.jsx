"use client";
import React from "react";

export default function Message({ username, text, time }) {
  return (
    <div className="mb-2">
      <span className="font-semibold text-blue-600">{username}: </span>
      <span>{text}</span>
      <span className="text-xs text-gray-400 ml-2">{time}</span>
    </div>
  );
}
