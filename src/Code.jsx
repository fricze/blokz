import { parser } from "@lezer/rust";
import { classHighlighter, highlightTree } from "@lezer/highlight";
import "./code.css";
import "./lezer.css";
import { interpolate, useCurrentFrame } from "remotion";
import { isLineBreak } from "typescript";

function highlightCode(
  code,
  tree,
  highlighter,
  putText,
  putBreak,
  from = 0,
  to = code.length,
) {
  let pos = from;
  function writeTo(p, classes) {
    if (p <= pos) return;
    for (let text = code.slice(pos, p), i = 0; ; ) {
      let nextBreak = text.indexOf("\n", i);
      let upto = nextBreak < 0 ? text.length : nextBreak;
      if (upto > i) putText(text.slice(i, upto), classes, pos, p);
      if (nextBreak < 0) break;
      putBreak();
      i = nextBreak + 1;
    }
    pos = p;
  }

  highlightTree(
    tree,
    highlighter,
    (from, to, classes) => {
      writeTo(from, "");
      writeTo(to, classes);
    },
    from,
    to,
  );
  writeTo(to, "");
}

const ToRemove = ({ group, text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [1, 0], {
    extrapolateRight: "clamp",
  });

  const widthStart = group
    .map(([_, value]) => value.length)
    .reduce((value, acc) => acc + value, 0);
  const widthEnd = text.length;

  const width = interpolate(frame, [0, 15], [widthStart, widthEnd], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      data-type="to-remove"
      className="group empty"
      style={{
        opacity,
        width: `${width}ch`,
      }}
    >
      {group.map(([_, value, el]) => el)}
    </span>
  );
};

const ToInsert = ({ title, classes, text }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      data-type="to-insert"
      className={classes}
      data-length={text.length}
      style={{ opacity, marginLeft: `-${text.length}ch` }}
      title={title}
    >
      {text}
    </span>
  );
};

const ToInsertLine = ({ title, classes, text, style = {} }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });
  const height = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span
      data-type="to-insert-line"
      className={classes}
      data-length={text.length}
      style={{ opacity, height: `${height}lh`, ...style }}
      title={title}
    >
      {text}
    </span>
  );
};

const InsertBlock = ({ start, end, children }) => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, 15], [start, end], {
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <span className="empty" style={{ width: `${width}ch`, opacity }}>
      {children}
    </span>
  );
};

export const Code = ({ code, replace, insert, insertLine }) => {
  insert = insert || [];

  const oldCode = code;

  const result = [];
  const oldResult = [];

  const typesMap = new Map();
  const oldTypesMap = new Map();

  const replacePositions = [];
  const insertLinePositions = [];
  const removePositions = [];

  const insertAt = (str, sub, pos) =>
    `${str.slice(0, pos)}${sub}${str.slice(pos)}`;

  for (const [[token, index], value] of insert) {
    const position = getIndicesOf(token, code, true)[index];
    code = insertAt(code, value, position + 1);
  }

  const replaceAt = (str, sub, pos, length) =>
    `${str.slice(0, pos - 1)}${sub}${str.slice(pos + length - 1)}`;

  for (const [index, value] of insertLine) {
    console.log(index, value);
    const lines = [...code.matchAll("\n")];
    const line = lines[index];
    const position = line.index;

    insertLinePositions.push([position + 1, position + value.length + 2]);

    code = insertAt(code, value, position + 1);
  }

  // New Code
  for (const [[token, index], value] of replace) {
    const position = getIndicesOf(token, code, true)[index];
    replacePositions.push([
      position,
      position + value.length,
      `${token}-${index}`,
      position + token.length,
    ]);
    code = replaceAt(code, value, position + 1, token.length);
  }

  // Old Code. Remove positions
  // Old Code. Remove positions
  // Old Code. Remove positions
  // Old Code. Remove positions
  for (const [[token, index], value] of replace) {
    const position = getIndicesOf(token, oldCode, true)[index];
    removePositions.push([
      position,
      position + value.length,
      `${token}-${index}`,
      position + token.length,
    ]);
    // CODE code = replaceAt(code, value, position + 1, token.length);
  }

  const groups = [];

  highlightCode(
    oldCode,
    parser.parse(oldCode),
    classHighlighter,
    emitOld,
    emitBreakOld,
  );

  const groupedElements = Map.groupBy(groups, ([key]) => key);

  function emitOld(text, classes, start, stop) {
    const insertPos = removePositions.find(
      ([iStart, _, __, iStop]) => start >= iStart && stop <= iStop,
    );

    const count = oldTypesMap.get(text) || 0;
    oldTypesMap.set(text, count + 1);
    const group = insertPos ? insertPos[2] : ``;
    const key = `${text}-${count}`;

    if (insertPos) {
      groups.push([
        group,
        text,
        <span
          key={key}
          className={classes}
          data-key={key}
          data-group={group}
          data-length={text.length}
          style={{ "--length": text.length }}
          title={key}
        >
          {text}
        </span>,
      ]);
    }

    if (classes) {
      oldResult.push(
        <span
          key={key}
          className={classes}
          data-key={key}
          data-group={group}
          data-length={text.length}
          style={{ "--length": text.length }}
          title={key}
        >
          {text}
        </span>,
      );
    } else {
      oldResult.push(<span style={{ whiteSpace: "pre" }}>{text}</span>);
    }
  }

  function emitBreakOld() {
    oldResult.push("\n");
  }

  function emit(text, classes, start, stop) {
    const insertPos =
      replacePositions.find(
        ([iStart, iStop]) => start >= iStart && stop <= iStop,
      ) ||
      replacePositions.find(
        ([iStart, iStop]) => start === iStart && iStop === iStart,
      );

    const insertLinePos = insertLinePositions.find(
      ([iStart, iStop]) => start >= iStart && stop <= iStop,
    );

    let insertKey;
    if (insertPos && typeof classes === "string") {
      if (insertPos[0] === start) {
        insertKey = insertPos[2];
      }

      if (insertKey && groupedElements.has(insertKey)) {
        const group = groupedElements.get(insertKey);
        result.push(<ToRemove group={group} text={text} />);
      }
    }

    if (classes) {
      const count = typesMap.get(text) || 0;
      typesMap.set(text, count + 1);

      const key = `${text}-${count}`;
      result.push(
        insertLinePos && typeof classes === "string" ? (
          <ToInsertLine key={key} title={key} classes={classes} text={text} />
        ) : insertPos && typeof classes === "string" ? (
          <ToInsert key={key} title={key} classes={classes} text={text} />
        ) : (
          <span
            key={key}
            className={classes}
            data-key={key}
            data-length={text.length}
            style={{ "--length": text.length }}
            title={key}
          >
            {text}
          </span>
        ),
      );
    } else {
      const count = typesMap.get(text) || 0;
      typesMap.set(text, count + 1);

      const key = `${text}-${count}`;
      result.push(
        insertLinePos ? (
          <ToInsertLine
            key={key}
            title={key}
            classes={classes}
            text={text}
            style={{ whiteSpace: "pre" }}
          />
        ) : (
          <span style={{ whiteSpace: "pre" }}>{text}</span>
        ),
      );
    }
  }

  function emitBreak() {
    result.push("\n");
  }

  function getIndicesOf(searchStr, str, caseSensitive) {
    const searchStrLen = searchStr.length;
    if (searchStrLen === 0) {
      return [];
    }

    let startIndex = 0;
    const indices = [];
    let index;

    if (!caseSensitive) {
      str = str.toLowerCase();
      searchStr = searchStr.toLowerCase();
    }
    while ((index = str.indexOf(searchStr, startIndex)) > -1) {
      indices.push(index);
      startIndex = index + searchStrLen;
    }
    return indices;
  }

  highlightCode(code, parser.parse(code), classHighlighter, emit, emitBreak);

  for (const [
    [openingToken, openingIndex],
    value,
    [closingToken, closingIndex],
  ] of insert) {
    const openingKey = `${openingToken}-${openingIndex}`;
    const closingKey = `${closingToken}-${closingIndex}`;

    const openingPosition = result.findIndex(
      (child) => child.key === openingKey,
    );
    const closingPosition = result.findIndex(
      (child) => child.key === closingKey,
    );

    const startPosition = openingPosition + 1;
    const appearing = result.slice(startPosition, closingPosition);
    const { length } = appearing
      .map((a) => (typeof a === "object" ? a.props.children : a))
      .join("");

    result.splice(
      openingPosition + 1,
      appearing.length,
      <InsertBlock start={0} end={length}>
        {appearing}
      </InsertBlock>,
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <div>{result}</div>
      </header>
    </div>
  );
};
