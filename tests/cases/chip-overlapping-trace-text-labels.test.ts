import { expect, test } from "bun:test"
import type { CircuitJson, SchematicText } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

// Trace-generated text has source_trace_id in circuit JSON exports. Keep that
// ownership: removing it turns this into an ordinary annotation collision.
const traceLabel = (
  id: string,
  traceId: string,
  text: string,
  x: number,
  anchor: "left" | "right",
): SchematicText & { source_trace_id: string } => ({
  type: "schematic_text",
  schematic_text_id: id,
  source_trace_id: traceId,
  text,
  position: { x, y: -0.49 },
  anchor,
  rotation: 0,
  font_size: 0.12,
  color: "rgb(132, 0, 0)",
})

const circuitJson: CircuitJson = [
  {
    type: "source_component",
    source_component_id: "source_component_0",
    ftype: "simple_chip",
    name: "U1",
  },
  {
    type: "schematic_component",
    schematic_component_id: "schematic_component_0",
    source_component_id: "source_component_0",
    center: { x: 0, y: 0 },
    size: { width: 2, height: 2 },
    is_box_with_pins: true,
  },
  ...(["left", "right"] as const).flatMap((side, index): CircuitJson => {
    const x = side === "left" ? -1.4 : 1.4
    const outerX = side === "left" ? -3 : 3
    const portId = `source_port_${index}`
    const traceId = `source_trace_${index}`
    const text = index === 0 ? "DRIVER_STEP" : "DRIVER_DIR"
    const anchor = side === "left" ? "right" : "left"
    return [
      {
        type: "source_port",
        source_port_id: portId,
        source_component_id: "source_component_0",
        name: `pin${index + 1}`,
        pin_number: index + 1,
      },
      {
        type: "schematic_port",
        schematic_port_id: `schematic_port_${index}`,
        source_port_id: portId,
        schematic_component_id: "schematic_component_0",
        center: { x, y: -0.6 },
        facing_direction: side,
        side_of_component: side,
        distance_from_component_edge: 0.4,
        pin_number: index + 1,
        display_pin_label: index === 0 ? "STEP" : "DIR",
        is_connected: true,
      },
      {
        type: "source_trace",
        source_trace_id: traceId,
        connected_source_port_ids: [portId],
        connected_source_net_ids: [],
      },
      {
        type: "schematic_trace",
        schematic_trace_id: `schematic_trace_${index}`,
        source_trace_id: traceId,
        edges: [{ from: { x, y: -0.6 }, to: { x: outerX, y: -0.6 } }],
        junctions: [],
      },
      // A stale label and its rerouted replacement, offset by half a unit.
      traceLabel(`label_${index}_old`, traceId, text, x, anchor),
      traceLabel(
        `label_${index}_new`,
        traceId,
        text,
        x + (index ? 0.5 : -0.5),
        anchor,
      ),
    ]
  }),
]

test("reports overlapping trace-generated labels beside a single chip", async () => {
  const analysis = analyzeSchematicPlacement(circuitJson)

  await expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      width: 900,
      height: 450,
      highlightIssues: ["SchematicTextCollision"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)

  const collisions = analysis
    .getIssues()
    .filter((issue) => issue.lineItemType === "SchematicTextCollision")
  expect(collisions).toHaveLength(2)
  expect(
    collisions.map((issue) => [
      issue.schematicTextId,
      issue.collidingObject.id,
    ]),
  ).toEqual([
    ["label_0_old", "label_0_new"],
    ["label_1_old", "label_1_new"],
  ])
  for (const issue of collisions) {
    // Moving generated text alone would be undone by the next trace render.
    expect(issue.suggestedMove).toBeUndefined()
    expect(issue.message).toContain("owning trace's label placement")
  }

  // A readable label beside its wire must not become a false positive.
  const separated = circuitJson.map((element) =>
    element.type === "schematic_text" &&
    ["label_0_new", "label_1_new"].includes(element.schematic_text_id)
      ? {
          ...element,
          position: { ...element.position, y: element.position.y + 0.4 },
        }
      : element,
  )
  expect(analyzeSchematicPlacement(separated).getIssues()).toHaveLength(0)
})
