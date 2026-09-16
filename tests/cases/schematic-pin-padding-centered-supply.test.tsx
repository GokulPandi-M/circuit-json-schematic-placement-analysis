import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("reproduces corner padding warnings for centered supply pins", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled>
      <chip
        name="U1"
        footprint="soic8"
        schWidth={1.7}
        pinLabels={{
          pin1: "VDD",
          pin2: "SDA",
          pin3: "SCL",
          pin4: "EN",
          pin5: "OUT",
          pin6: "INT",
          pin7: "NC",
          pin8: "GND",
        }}
        schPinArrangement={{
          topSide: ["VDD"],
          bottomSide: ["GND"],
          leftSide: ["SDA", "SCL", "EN"],
          rightSide: ["OUT", "INT", "NC"],
        }}
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issuesLineItem = analysis
    .getLineItems()
    .find((lineItem) => lineItem.lineItemType === "SchematicPlacementIssues")
  if (issuesLineItem?.lineItemType !== "SchematicPlacementIssues") {
    throw new Error("Expected schematic placement issues")
  }
  const pinPaddingIssues = issuesLineItem.issues.filter(
    (issue) => issue.lineItemType === "SchematicPinPaddingToEdgeTooLarge",
  )

  expect(pinPaddingIssues).toHaveLength(1)
  const issue = pinPaddingIssues[0]!
  expect(issue.schematicBox.width).toBeCloseTo(1.7)
  expect(issue.suggestedSchWidth).toBeCloseTo(0.77)
  expect(issue.paddingDetails).toHaveLength(4)
  expect(
    issue.paddingDetails?.map(({ pinSide, edgeSide }) => [pinSide, edgeSide]),
  ).toEqual([
    ["top", "left"],
    ["top", "right"],
    ["bottom", "left"],
    ["bottom", "right"],
  ])
  for (const detail of issue.paddingDetails!) {
    expect(detail.measuredPadding).toBeCloseTo(0.85)
    expect(detail.maxAllowedPadding).toBeCloseTo(0.385)
    expect(detail.excessPadding).toBeCloseTo(0.465)
  }
  expect(
    createSchematicAnalysisFixtureSvg({
      circuitJson,
      analysis,
      highlightIssues: ["SchematicPinPaddingToEdgeTooLarge"],
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
