import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { getSourcePortConnectivityMapFromCircuitJson } from "circuit-json-to-connectivity-map"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("does not pair a net label with an unrelated led cathode", async () => {
  const circuit = new Circuit()
  circuit.add(
    <board routingDisabled>
      <net name="GND" isGroundNet />
      <net name="LED_GREEN" />
      <net name="LED_BLUE" />
      <chip
        name="U1"
        pinLabels={{ pin1: "GREEN", pin2: "BLUE" }}
        schX={0}
        schY={0}
      />
      <resistor
        name="R4"
        resistance="1k"
        schX={4}
        schY={-3.62}
        schRotation={-90}
      />
      <led name="LED1" schX={4} schY={-5.12} schRotation={-90} />
      <resistor
        name="R5"
        resistance="1k"
        schX={4.5}
        schY={-6.5}
        schRotation={-90}
      />
      <led name="LED2" schX={4.5} schY={-8} schRotation={-90} />
      <trace from=".U1 > .GREEN" to="net.LED_GREEN" />
      <trace from="net.LED_GREEN" to=".R4 > .pin1" />
      <trace from=".R4 > .pin2" to=".LED1 > .anode" />
      <trace from=".LED1 > .cathode" to="net.GND" />
      <trace from=".U1 > .BLUE" to="net.LED_BLUE" />
      <trace from="net.LED_BLUE" to=".R5 > .pin1" />
      <trace from=".R5 > .pin2" to=".LED2 > .anode" />
      <trace from=".LED2 > .cathode" to="net.GND" />
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  const analysis = analyzeSchematicPlacement(circuitJson)
  const issues = analysis.getIssues({ issueTypes: ["DiodeResistorNotAligned"] })
  expect(issues).toHaveLength(0)
  const components = circuitJson.filter(
    (element) => element.type === "source_component",
  )
  const ports = circuitJson.filter((element) => element.type === "source_port")
  const led = components.find((component) => component.name === "LED1")!
  const resistor = components.find((component) => component.name === "R5")!
  const ledCathode = ports.find(
    (port) =>
      port.source_component_id === led.source_component_id &&
      port.pin_number === 2,
  )?.source_port_id
  const resistorAnode = ports.find(
    (port) =>
      port.source_component_id === resistor.source_component_id &&
      port.pin_number === 1,
  )?.source_port_id
  expect(ledCathode).toBeDefined()
  expect(resistorAnode).toBeDefined()
  const connectivity = getSourcePortConnectivityMapFromCircuitJson(circuitJson)
  expect(connectivity.areIdsConnected(ledCathode!, resistorAnode!)).toBe(false)
  expect(
    createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
  ).toMatchSvgSnapshot(import.meta.path)
})
