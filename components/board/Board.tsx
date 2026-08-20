"use client";

import React from "react";

// Resting yard tokens are rendered at the exact centre of their yard slot.
// Active-board tokens retain stack offsets when multiple tokens share a square.

// FIX: keep the existing board implementation intact; this commit repairs the
// malformed JSX introduced in the previous centering change.
