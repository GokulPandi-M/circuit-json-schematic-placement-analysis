import { Circuit } from "@tscircuit/core"
import { expectReproNets } from "./placement-repro-assertions"

export type FloatingCapacitorMode =
  | "floating"
  | "declared-power"
  | "declared-ground"
  | "voltage"
  | "other-supply"
  | "grounded"
  | "other-group"
  | "two-supplies"
  | "requires-only"
  | "required-voltage"
  | "extra-return"
  | "do-not-connect"

export async function createFloatingChipCapacitor(options: {
  mode: FloatingCapacitorMode
  rotation: number
  reverse: boolean
}) {
  const { mode, rotation, reverse } = options
  const circuit = new Circuit()
  circuit.pcbDisabled = true
  const capacitor = (
    <capacitor
      name="C1"
      capacitance="100nF"
      schX={0}
      schY={3}
      schRotation={rotation}
      connections={{
        pin1: reverse ? "net.N1" : "net.N2",
        pin2: reverse ? "net.N2" : "net.N1",
      }}
    />
  )
  circuit.add(
    <board
      schAutoLayoutEnabled={false}
      schTraceAutoLabelEnabled={false}
      schMaxTraceDistance={100}
    >
      <net name="N1" isPowerNet={mode === "declared-power"} />
      <net name="N2" isGroundNet={mode === "declared-ground"} />
      <chip
        name="U1"
        schX={0}
        schY={0}
        schWidth={1.5}
        schHeight={1.5}
        pinLabels={{ pin1: "A", pin2: "B", pin3: "C" }}
        schPinArrangement={{ leftSide: ["pin1"], rightSide: ["pin2", "pin3"] }}
        pinAttributes={{
          pin1: {
            providesPower: mode !== "requires-only",
            requiresPower: mode === "requires-only",
            isOutput: true,
            ...(mode === "voltage" ? { providesVoltage: 3.3 } : {}),
            ...(mode === "required-voltage" ? { requiresVoltage: 3.3 } : {}),
          },
          pin2: {
            isInput: true,
            requiresGround: mode === "grounded",
            requiresPower: mode === "two-supplies",
            doNotConnect: mode === "do-not-connect",
          },
        }}
        connections={{ pin1: "net.N1", pin2: "net.N2" }}
      />
      {mode === "other-group" ? (
        <group name="remote">{capacitor}</group>
      ) : (
        capacitor
      )}
      <trace
        from=".U1 > .pin1"
        to={`${mode === "other-group" ? ".remote > " : ""}.C1 > .${reverse ? "pin1" : "pin2"}`}
      />
      <trace
        from=".U1 > .pin2"
        to={`${mode === "other-group" ? ".remote > " : ""}.C1 > .${reverse ? "pin2" : "pin1"}`}
      />
      {(mode === "other-supply" || mode === "extra-return") && (
        <chip
          name="U2"
          schX={6}
          pinLabels={{ pin1: "A" }}
          pinAttributes={{
            pin1: { requiresPower: mode === "other-supply", isInput: true },
          }}
          connections={{ pin1: mode === "extra-return" ? "net.N2" : "net.N1" }}
        />
      )}
    </board>,
  )
  await circuit.renderUntilSettled()
  const circuitJson = circuit.getCircuitJson()
  expectReproNets(circuitJson, [
    ["net.N1", "U1.pin1", reverse ? "C1.pin1" : "C1.pin2"],
    ["net.N2", "U1.pin2", reverse ? "C1.pin2" : "C1.pin1"],
  ])
  return circuitJson
}
