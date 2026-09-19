import { expect, test } from "bun:test"
import { Circuit } from "@tscircuit/core"
import { analyzeSchematicPlacement } from "lib/index"
import { createSchematicAnalysisFixtureSvg } from "../fixtures/create-schematic-analysis-fixture-svg"

test("preserves alignment warnings for direct and named-net connections", async () => {
  for (const connection of ["direct", "named-net"] as const) {
    const circuit = new Circuit()
    circuit.add(
      <board routingDisabled>
        <led name="D1" schX={0} schY={0} />
        <resistor name="R1" resistance="1k" schX={2} schY={2} />
        {connection === "direct" && (
          <trace from=".D1 > .cathode" to=".R1 > .pin1" />
        )}
        {connection === "named-net" && (
          <>
            <net name="SIGNAL" />
            <trace from=".D1 > .cathode" to="net.SIGNAL" />
            <trace from=".R1 > .pin1" to="net.SIGNAL" />
          </>
        )}
      </board>,
    )
    await circuit.renderUntilSettled()
    const circuitJson = circuit.getCircuitJson()
    const analysis = analyzeSchematicPlacement(circuitJson)
    const issues = analysis.getIssues({
      issueTypes: ["DiodeResistorNotAligned"],
    })
    expect(issues).toHaveLength(1)
    expect(issues[0]).toMatchObject({
      diodeSchematicBox: { sourceComponentName: "D1" },
      resistorSchematicBox: { sourceComponentName: "R1" },
    })
    expect(
      createSchematicAnalysisFixtureSvg({ circuitJson, analysis }),
    ).toMatchSvgSnapshot(import.meta.path, connection)
  }
})
