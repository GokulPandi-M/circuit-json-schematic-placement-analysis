import { expect, test } from "bun:test"
import type { CircuitJson } from "circuit-json"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

// Complete circuit JSON, including ownership of the generated trace labels.
const circuitJson = [
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
    center: {
      x: 0,
      y: 0,
    },
    size: {
      width: 2,
      height: 2,
    },
    is_box_with_pins: true,
  },
  {
    type: "source_port",
    source_port_id: "source_port_0",
    source_component_id: "source_component_0",
    name: "pin1",
    pin_number: 1,
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_0",
    source_port_id: "source_port_0",
    schematic_component_id: "schematic_component_0",
    center: {
      x: -1.4,
      y: -0.6,
    },
    facing_direction: "left",
    side_of_component: "left",
    distance_from_component_edge: 0.4,
    pin_number: 1,
    display_pin_label: "STEP",
    is_connected: true,
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_0",
    connected_source_port_ids: ["source_port_0"],
    connected_source_net_ids: [],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_0",
    source_trace_id: "source_trace_0",
    edges: [
      {
        from: {
          x: -1.4,
          y: -0.6,
        },
        to: {
          x: -3,
          y: -0.6,
        },
      },
    ],
    junctions: [],
  },
  {
    type: "schematic_text",
    schematic_text_id: "label_0_old",
    source_trace_id: "source_trace_0",
    text: "DRIVER_STEP",
    position: {
      x: -1.4,
      y: -0.49,
    },
    anchor: "right",
    rotation: 0,
    font_size: 0.12,
    color: "rgb(132, 0, 0)",
  },
  {
    type: "schematic_text",
    schematic_text_id: "label_0_new",
    source_trace_id: "source_trace_0",
    text: "DRIVER_STEP",
    position: {
      x: -1.9,
      y: -0.49,
    },
    anchor: "right",
    rotation: 0,
    font_size: 0.12,
    color: "rgb(132, 0, 0)",
  },
  {
    type: "source_port",
    source_port_id: "source_port_1",
    source_component_id: "source_component_0",
    name: "pin2",
    pin_number: 2,
  },
  {
    type: "schematic_port",
    schematic_port_id: "schematic_port_1",
    source_port_id: "source_port_1",
    schematic_component_id: "schematic_component_0",
    center: {
      x: 1.4,
      y: -0.6,
    },
    facing_direction: "right",
    side_of_component: "right",
    distance_from_component_edge: 0.4,
    pin_number: 2,
    display_pin_label: "DIR",
    is_connected: true,
  },
  {
    type: "source_trace",
    source_trace_id: "source_trace_1",
    connected_source_port_ids: ["source_port_1"],
    connected_source_net_ids: [],
  },
  {
    type: "schematic_trace",
    schematic_trace_id: "schematic_trace_1",
    source_trace_id: "source_trace_1",
    edges: [
      {
        from: {
          x: 1.4,
          y: -0.6,
        },
        to: {
          x: 3,
          y: -0.6,
        },
      },
    ],
    junctions: [],
  },
  {
    type: "schematic_text",
    schematic_text_id: "label_1_old",
    source_trace_id: "source_trace_1",
    text: "DRIVER_DIR",
    position: {
      x: 1.4,
      y: -0.49,
    },
    anchor: "left",
    rotation: 0,
    font_size: 0.12,
    color: "rgb(132, 0, 0)",
  },
  {
    type: "schematic_text",
    schematic_text_id: "label_1_new",
    source_trace_id: "source_trace_1",
    text: "DRIVER_DIR",
    position: {
      x: 1.9,
      y: -0.49,
    },
    anchor: "left",
    rotation: 0,
    font_size: 0.12,
    color: "rgb(132, 0, 0)",
  },
] as CircuitJson

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
