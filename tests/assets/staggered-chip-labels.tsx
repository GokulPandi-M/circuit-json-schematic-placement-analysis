import { Circuit } from "@tscircuit/core"
import type { CircuitJson } from "circuit-json"

/** Recreate the screenshot's two left pins and centered right pin using native
 * box rendering. Rotating the pin banks also exercises the height constraint. */
export async function createStaggeredChipLabelsCircuitJson(
  options: { vertical?: boolean; dimension?: number } = {},
): Promise<CircuitJson> {
  const circuit = new Circuit()
  const vertical = options.vertical ?? false
  const dimension = options.dimension ?? 1.4
  circuit.add(
    <board width="10mm" height="10mm" routingDisabled>
      <chip
        name="SW3"
        manufacturerPartNumber="JS102011SAQN"
        footprint="sot23"
        schWidth={vertical ? 0.6 : dimension}
        schHeight={vertical ? dimension : 0.6}
        schPinSpacing={0.2}
        pinLabels={{ pin1: "THROW1", pin2: "COMMON", pin3: "THROW2" }}
        schPinArrangement={
          vertical
            ? {
                topSide: { pins: [1, 2], direction: "left-to-right" },
                bottomSide: { pins: [3], direction: "left-to-right" },
              }
            : {
                leftSide: { pins: [1, 2], direction: "top-to-bottom" },
                rightSide: { pins: [3], direction: "top-to-bottom" },
              }
        }
      />
    </board>,
  )
  await circuit.renderUntilSettled()
  return circuit.getCircuitJson()
}
