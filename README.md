# ERDSketch

ERDSketch is a Design IDE for growing data models from Concept Seeds into flows, logical models, physical schemas, and plain-text design knowledge.

## Frontend

```bash
npm install
npm run dev
```

The first screen is a Concept Seeds brainstorm canvas built with React, Tailwind CSS, and daisyUI.

## Backend

```bash
go run ./server/cmd/erdsketch
```

The current backend exposes a small read API for plain-text seed files under `model/seeds/`.

## Plain-Text Model

Model files are intended to stay small and Git-friendly.

```text
model/
  seeds/
    order.seed.yaml
    order-reception.seed.yaml
    price-at-order.seed.yaml
```
