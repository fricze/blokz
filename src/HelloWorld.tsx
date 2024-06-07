import {
  AbsoluteFill,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Code } from "./Code.jsx";

const code = `fn main() {
    println!("Hello, world!");
}

fn ice_cream_booth(first, second) {
    println!("who likes ice cream?!");
}
`;

export const HelloWorld = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Fade out the animation at the end
  const opacity = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames - 15],
    [1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <AbsoluteFill style={{ opacity }}>
        <Sequence>
          <Code
            code={code}
            replace={[
              // Order matters!
              [[`main`, 0], "principale"],
              [[`first, second`, 0], "just_one"],
              // [[`"Hello, world!"`, 0], `"Hello, world!" + first`],
            ]}
            insert={[[["(", 0], "first_argument, second_argument", [")", 0]]]}
            insertLine={[[5, `    println!(just_one);`]]}
            // insertLine={[]}
            // eslint-disable-next-line capitalized-comments
            // insert={[]}
          />
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
