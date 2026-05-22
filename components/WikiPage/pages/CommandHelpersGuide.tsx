import React from 'react';
import styles from '../styles.module.css';

export function CommandHelpersGuide() {
  return (
    <>
      <section>
        <h2>Command Helpers</h2>
        <p>
          Aliases, triggers, and scripts all run JavaScript through the same
          pattern engine. When a regex <strong>Pattern</strong> matches, the
          <strong> Command</strong> body can call the helpers below to queue MUD
          commands, pause between steps, play a sound, update variables, or run a
          script.
        </p>
        <p>
          For <strong>triggers</strong>, the pattern is matched against incoming
          game text. For <strong>aliases</strong>, it is matched against what you
          type. For <strong>scripts</strong>, there is no pattern — another
          alias or trigger calls <code>sendEvent</code> to run the script body.
        </p>
      </section>

      <section>
        <h3>Quick Reference</h3>
        <div className={styles.codeTable}>
          <div>
            <strong>Helper</strong>
            <strong>Summary</strong>
          </div>
          <div>
            <code>matches</code>
            <span>Regex capture groups from the pattern match.</span>
          </div>
          <div>
            <code>send(cmd)</code>
            <span>Queue one command to the MUD.</span>
          </div>
          <div>
            <code>sendAll(a, b, …)</code>
            <span>Queue several commands in order.</span>
          </div>
          <div>
            <code>wait(ms)</code>
            <span>Pause before the next queued command (milliseconds).</span>
          </div>
          <div>
            <code>speedwalk(actions, backwards?, delay?)</code>
            <span>Queue movement from a speedwalk string.</span>
          </div>
          <div>
            <code>setVariable(name, value)</code>
            <span>Save a variable for later aliases or triggers.</span>
          </div>
          <div>
            <code>sendEvent(name)</code>
            <span>Run the first enabled script with that event name.</span>
          </div>
          <div>
            <code>alert()</code>
            <span>Play the client alert sound.</span>
          </div>
          <div>
            <code>yourVariable</code>
            <span>Any saved variable name (read-only in command code).</span>
          </div>
        </div>
      </section>

      <section>
        <h3>matches</h3>
        <p>
          The result of matching the pattern against the current line (trigger)
          or your typed input (alias). <code>matches[0]</code> is the full
          match; <code>matches[1]</code>, <code>matches[2]</code>, … are capture
          groups.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger: game says "John says: hello"
pattern: ^(.+) says: (.+)$
command:
const speaker = matches[1]
const words = matches[2]
send(\`tell \${speaker} I heard: \${words}\`)

// Alias: you type "wa sword"
pattern: ^wa (.+)$
command:
send(\`wield \${matches[1]}\`)`}</pre>
      </section>

      <section>
        <h3>send</h3>
        <p>Queues a single command. It is sent to the MUD when the engine runs the queue.</p>
        <pre className={styles.codeBlock}>{`// Trigger: react to hunger message
pattern: ^You are hungry$
command:
send('eat bread')`}</pre>
      </section>

      <section>
        <h3>sendAll</h3>
        <p>
          Queues multiple commands in order. Useful for turn-ins, recalls, or
          short routines without writing many <code>send</code> lines.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger: quest hand-in
pattern: 你可以交差去了
command:
wait(4000)
sendAll('recall camp', 'quest1 over', 'quest1')`}</pre>
      </section>

      <section>
        <h3>wait</h3>
        <p>
          Inserts a delay before the <em>next</em> queued command. Time is in
          milliseconds. The MUD often needs a short pause before accepting the
          next action after a message or room update.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger: wait, then send
pattern: 你对说道：这寥寥数行足可明心
command:
wait(3000)
sendAll('recall camp', 'quest1 over', 'quest1')

// Alias: spaced steps
pattern: ^practice$
command:
send('practice dodge 1')
wait(1000)
send('practice parry 1')`}</pre>
      </section>

      <section>
        <h3>speedwalk</h3>
        <p>
          Expands a comma-separated speedwalk string into movement commands.
          Optional second argument reverses the path using opposite directions.
          Optional third argument is a delay in <strong>seconds</strong> between
          each step.
        </p>
        <pre className={styles.codeBlock}>{`// Alias: cross map
pattern: ^gobai$
command:
speedwalk('2ne,3e,2n,e')

// Trigger: continue route after climbing
pattern: 你顺着树杆爬了上来。
command:
speedwalk('su,3s,e')
send('ask zhanggui about boat')

// Reverse a path with 0.5s between steps
pattern: ^back$
command:
speedwalk('2n,3e,ne', true, 0.5)`}</pre>
        <p>Supported direction codes (repeat with a number prefix, e.g. <code>2e</code>):</p>
        <div className={styles.codeTable}>
          <div>
            <strong>Code</strong>
            <strong>Command sent</strong>
          </div>
          <div>
            <code>n, s, e, w</code>
            <span>north, south, east, west</span>
          </div>
          <div>
            <code>ne, nw, se, sw</code>
            <span>northeast, northwest, southeast, southwest</span>
          </div>
          <div>
            <code>u, d</code>
            <span>up, down</span>
          </div>
          <div>
            <code>nu, su, eu, wu, nd, sd, ed, wd</code>
            <span>northup, southup, eastup, westup, northdown, southdown, eastdown, westdown</span>
          </div>
        </div>
        <p>
          Unknown codes are skipped and logged in the browser console. Use
          <code>send</code> for non-standard movement (for example{' '}
          <code>send('climb up')</code>).
        </p>
      </section>

      <section>
        <h3>setVariable</h3>
        <p>
          Saves a value to the Variables store so other aliases and triggers can
          read it by name. Use string names and values.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger: store quest target from game text
pattern: 诛杀(.+?)。
command:
setVariable('target', matches[1])
send(\`say target is \${matches[1]}\`)

// Trigger: update patrol index
pattern: 拿出小册子记录了下来。
command:
const next = Number(patrol_idx) + 1
setVariable('patrol_idx', String(next))
send('patrol')`}</pre>
      </section>

      <section>
        <h3>sendEvent</h3>
        <p>
          Runs the first <strong>enabled</strong> script whose Event field equals
          the given name. Scripts use the same helpers but do not receive{' '}
          <code>matches</code> unless you pass data via variables first.
        </p>
        <pre className={styles.codeBlock}>{`// Script (event: prepare_gear)
send("unwield all")
send(\`wield \${weapon}\`)
send("wear all")

// Trigger or alias that calls it
pattern: ^ready$
command:
sendEvent('prepare_gear')`}</pre>
      </section>

      <section>
        <h3>alert</h3>
        <p>Plays the client alert sound (<code>/alert.mp3</code>). Useful when a trigger needs your attention.</p>
        <pre className={styles.codeBlock}>{`// Trigger: notify on attack
pattern: (.+) hits you
command:
alert()
send(\`kill \${matches[1]}\`)`}</pre>
      </section>

      <section>
        <h3>Using Saved Variables</h3>
        <p>
          Variables from the Variables menu are exposed by name in alias,
          trigger, and script command code. Reference them directly — they are
          not passed as function arguments.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger uses variables set earlier
pattern: 你顺着树杆爬了上来。
command:
sendAll(\`swing \${treeDirection}\`, \`swing \${treeDirection}\`)
if (destination === 'baiyun') {
  speedwalk('su,3s,e')
  send('give qiyue to fox')
}

// Alias reads weapon variable
pattern: ^w$
command:
send(\`wield \${weapon}\`)`}</pre>
      </section>

      <section>
        <h3>Execution Order</h3>
        <p>
          Helpers only <em>queue</em> actions during command execution. The client
          then runs the queue in order: each <code>send</code> or speedwalk step
          is sent to the MUD, and each <code>wait</code> blocks until the delay
          finishes before the next item runs. If a pattern throws an error, the
          queue for that match is discarded and nothing is sent.
        </p>
        <ul className={styles.bulletList}>
          <li>Triggers: if nothing matches, no commands are sent.</li>
          <li>Aliases: if nothing matches, your typed line is sent as-is.</li>
          <li>Multiple enabled triggers can match the same line; all matching command bodies run.</li>
        </ul>
      </section>
    </>
  );
}
