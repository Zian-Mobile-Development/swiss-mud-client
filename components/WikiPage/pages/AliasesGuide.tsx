import React from 'react';
import styles from '../styles.module.css';

export function AliasesGuide() {
  return (
    <>
      <section>
        <h2>Writing Aliases</h2>
        <p>
          Aliases turn short commands you type into one or more MUD commands.
          Each alias has a <strong>Name</strong>, a regex <strong>Pattern</strong>,
          a JavaScript <strong>Command</strong> body, and an enabled flag.
        </p>
        <p>
          Open <strong>Alias</strong> from the client menu, add a new alias,
          fill in the fields, then save it. When your input matches the pattern,
          the command body runs.
        </p>
      </section>

      <section>
        <h3>Alias Shape</h3>
        <div className={styles.codeTable}>
          <div>
            <strong>Field</strong>
            <strong>Purpose</strong>
          </div>
          <div>
            <code>name</code>
            <span>A label for the list, such as <code>【路径】老屋</code>.</span>
          </div>
          <div>
            <code>pattern</code>
            <span>A regular expression that matches what you type.</span>
          </div>
          <div>
            <code>command</code>
            <span>JavaScript code that sends commands or updates variables.</span>
          </div>
          <div>
            <code>enabled</code>
            <span>Turn the alias on or off without deleting it.</span>
          </div>
        </div>
      </section>

      <section>
        <h3>Simple Command Aliases</h3>
        <p>
          Use <code>send</code> for one command and <code>sendAll</code> for a
          batch of commands sent in order.
        </p>
        <pre className={styles.codeBlock}>{`// Type: ql
// Sends: quest list
pattern: ^ql$
command:
send('quest list')

// Type: qf
// Sends three commands
pattern: ^qf$
command:
sendAll("recall back", "u", "quest list")`}</pre>
      </section>

      <section>
        <h3>Patterns And Arguments</h3>
        <p>
          Alias patterns are regular expressions. Capture groups are available
          in <code>matches</code>. The first captured value is
          <code>matches[1]</code>, the second is <code>matches[2]</code>, and
          so on.
        </p>
        <pre className={styles.codeBlock}>{`// Type: qq 3
// Sends: quest take 3
pattern: ^qq(.+)?$
command:
const number = matches[1]?.trim()
send(\`quest take \${number}\`)

// Type: l luohan-quan 20
// Sends: learn luohan-quan from meng with 20
pattern: ^l (.+) (\\d+)$
command:
const skill = matches[1]
const amount = matches[2]
send(\`learn \${skill} from \${master} with \${amount}\`)`}</pre>
      </section>

      <section>
        <h3>Using Variables</h3>
        <p>
          Variables can be used directly by name inside an alias command. This
          keeps aliases short and lets you update routes, equipment, or quest
          targets from the Variables page.
        </p>
        <pre className={styles.codeBlock}>{`// Type: golw
// Uses the path_laowu variable
pattern: ^golw$
command:
speedwalk(\`\${path_laowu}\`, false, 0.5)

// Type: wa
// Uses the weapon variable
pattern: ^wa$
command:
send(\`wield \${weapon}\`)
send("wear all")`}</pre>
      </section>

      <section>
        <h3>Routes And Speedwalk</h3>
        <p>
          Use <code>speedwalk(actions, backwards, delay)</code> for movement
          routes. The first argument is a comma-separated route or a compact
          direction like <code>14s</code>. The second argument reverses the
          route when true. The third argument is delay in seconds between steps.
        </p>
        <pre className={styles.codeBlock}>{`// Go to Baiyun, then climb the tree
pattern: ^gobaiyun$
command:
setVariable('destination', 'baiyun')
setVariable('treeDirection', 'south')
speedwalk('14s', false, 0.3)
send('climb tree')

// Go to Wudang using a saved route
pattern: ^gowd$
command:
send("unwield all")
speedwalk(\`\${path_wd}\`, false, 0.5)
send("enter")`}</pre>
      </section>

      <section>
        <h3>Waits And Longer Flows</h3>
        <p>
          Use <code>wait(ms)</code> when the next command needs a pause. Wait
          time is in milliseconds.
        </p>
        <pre className={styles.codeBlock}>{`pattern: ^prep$
command:
send("unwield all")
speedwalk(\`\${get_pumpkin}\`)
wait(2000)
speedwalk(\`\${get_pumpkin}\`, true)
speedwalk("s,e")
send("fill skin")`}</pre>
      </section>

      <section>
        <h3>Conditional Aliases</h3>
        <p>
          Alias commands can use ordinary JavaScript. This is useful for setup
          aliases that change multiple variables based on one argument.
        </p>
        <pre className={styles.codeBlock}>{`// Type: ss luohan
pattern: ^ss (.+)$
command:
const skill = matches[1]
if (skill === 'luohan') {
  setVariable('curr_basic', 'unarmed')
  setVariable('curr_skill', 'luohan-quan')
  setVariable('master', 'meng')
} else if (skill === 'wuchen') {
  send('enable dodge wuchen-steps')
  setVariable('curr_basic', 'dodge')
  setVariable('curr_skill', 'wuchen-steps')
  setVariable('master', 'meng')
}`}</pre>
      </section>

      <section>
        <h3>Optional Arguments</h3>
        <p>
          Optional capture groups let one alias handle both a default command and
          a specific target.
        </p>
        <pre className={styles.codeBlock}>{`// Type: gc
// Sends: get all from corpse
// Type: gc sword
// Sends: get sword from corpse
pattern: ^gc(.+)?$
command:
const item = matches[1]?.trim()
if (item) {
  send(\`get \${item} from corpse\`)
} else {
  send("get all from corpse")
}`}</pre>
      </section>

      <section>
        <h3>Tips</h3>
        <ul className={styles.bulletList}>
          <li>Use <code>^</code> and <code>$</code> to match the whole input.</li>
          <li>Keep names grouped, such as <code>【路径】</code>, <code>【日常】</code>, or <code>【战斗】</code>.</li>
          <li>Disable experimental aliases instead of deleting them.</li>
          <li>Use variables for long paths and repeated values.</li>
          <li>Use <code>sendAll</code> for simple batches and separate lines for logic-heavy flows.</li>
        </ul>
      </section>
    </>
  );
}
