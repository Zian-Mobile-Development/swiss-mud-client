import React from 'react';
import styles from '../styles.module.css';

export function TriggersGuide() {
  return (
    <>
      <section>
        <h2>Writing Triggers</h2>
        <p>
          Triggers watch incoming MUD output. When a line of game text matches a
          trigger pattern, the command body runs automatically. They are useful
          for quest parsing, follow-up commands, patrol loops, practice loops,
          and map events.
        </p>
        <p>
          Open <strong>Triggers</strong> from the client menu, add a trigger,
          enter a <strong>Name</strong>, <strong>Pattern</strong>, and
          <strong>Command</strong>, then save it. Disable experimental triggers
          until you are ready to let them run.
        </p>
      </section>

      <section>
        <h3>Trigger Shape</h3>
        <div className={styles.codeTable}>
          <div>
            <strong>Field</strong>
            <strong>Purpose</strong>
          </div>
          <div>
            <code>name</code>
            <span>A label, such as <code>【师门】杀人目标</code>.</span>
          </div>
          <div>
            <code>pattern</code>
            <span>A regex matched against incoming game text.</span>
          </div>
          <div>
            <code>command</code>
            <span>JavaScript code to run when the pattern matches.</span>
          </div>
          <div>
            <code>enabled</code>
            <span>Controls whether the trigger is active.</span>
          </div>
        </div>
      </section>

      <section>
        <h3>Simple Reaction Triggers</h3>
        <p>
          A trigger can react to exact text and send one command. This is useful
          for room events or prompts that always need the same response.
        </p>
        <pre className={styles.codeBlock}>{`// When the game says this line, use the lighter.
pattern: 你在墙壁上摸到了一个象铜灯的东西。
command:
send('use lighter')`}</pre>
      </section>

      <section>
        <h3>Extracting Quest Data</h3>
        <p>
          Use capture groups in the regex to pull targets and locations out of
          quest text. Captured values are available in <code>matches</code>.
          Save them with <code>setVariable</code> so aliases can use them later.
        </p>
        <pre className={styles.codeBlock}>{`// Example quest text:
// 诛杀太史蓉。此人前不久曾经在白云岛的花海一带出没。
pattern: 诛杀(.+?)。\\s*此人前不久曾经在(.+?)的(.+?)一带出没。
command:
const target = matches[1]
const location = matches[2]
const location2 = matches[3]
send(\`say \${target} - \${location} - \${location2}\`)
setVariable('target', target)
setVariable('quest_location', location)
setVariable('quest_location_2', location2)`}</pre>
      </section>

      <section>
        <h3>Letter And Explore Quests</h3>
        <p>
          Similar patterns can identify quest type, destination, recipient, and
          sub-location. Store the type in <code>quest_type</code> so later
          aliases know what kind of quest flow to run.
        </p>
        <pre className={styles.codeBlock}>{`// Delivery quest
pattern: 到(.+?)去.*?交于(?:\\S{0,4})?(.+?)，.*?在(.+?)一带
command:
const location = matches[1]
const target = matches[2]
const location2 = matches[3]
setVariable('quest_location', location)
setVariable('quest_target', target)
setVariable('quest_location_2', location2)
setVariable('quest_type', 'letter')

// Explore quest
pattern: 吩咐你在三十分钟内去(.+?)的(.+?)上探秘。
command:
const location = matches[1]
const location2 = matches[2]
setVariable('quest_location', location)
setVariable('quest_location_2', location2)
setVariable('quest_type', 'findout')`}</pre>
      </section>

      <section>
        <h3>Completion Triggers</h3>
        <p>
          Completion triggers can wait briefly, then send the turn-in commands.
          Use <code>wait(ms)</code> when the MUD needs a moment before accepting
          the next command.
        </p>
        <pre className={styles.codeBlock}>{`// Kill quest done
pattern: 你可以交差去了
command:
wait(4000)
sendAll("recall camp", "quest1 over", "quest1")

// Letter quest done
pattern: 对你说道：这寥寥数行足可明心
command:
wait(3000)
sendAll("recall camp", "quest1 over", "quest1")`}</pre>
      </section>

      <section>
        <h3>Map Event Triggers</h3>
        <p>
          Triggers can continue route flows that start from aliases. For
          example, an alias can set <code>destination</code> and
          <code>treeDirection</code>, then a trigger reacts after climbing a
          tree.
        </p>
        <pre className={styles.codeBlock}>{`pattern: 你顺着树杆爬了上来。
command:
sendAll(\`swing \${treeDirection}\`, \`swing \${treeDirection}\`)
if (destination === 'baiyun') {
  speedwalk('su,3s,e')
  send('ask zhanggui about boat')
  speedwalk('w,s,2e')
  send('give qiyue to fox')
  sendAll('sail south', 'sail south', 'sail south')
}`}</pre>
      </section>

      <section>
        <h3>Practice And Learning Loops</h3>
        <p>
          Practice triggers can continue training when the game reports progress
          or rest when the character cannot continue.
        </p>
        <pre className={styles.codeBlock}>{`// Continue learning after progress
pattern: 你听了(.+)的指导，似乎有些心得
command:
send('kick')
wait(1000)
send(\`learn \${curr_skill} from \${master} with 5000\`)

// Sleep when practice is blocked
pattern: 你的身体状况无法强化练习
command:
send('sleep')

// Resume after waking up
pattern: 你一觉醒来
command:
send(\`practice \${curr_basic} 1\`)`}</pre>
      </section>

      <section>
        <h3>Patrol Loops</h3>
        <p>
          A patrol trigger can store an index, split a path variable into
          directions, move to the next direction, then update the index for the
          next trigger event.
        </p>
        <pre className={styles.codeBlock}>{`// Start patrol
pattern: 你去把(.+)和(.+)巡视一遍吧
command:
wait(3000)
setVariable('patrol_idx', "0")
send('recall family')
speedwalk(\`\${patrol_hua_init}\`)
send('patrol')

// Continue patrol after recording
pattern: 拿出小册子记录了下来。
command:
send("say")
wait(2500)
const dirArr = patrol_hua_path.split(',')
const patrolIdx = Number(\`\${patrol_idx}\`)
send(\`\${dirArr[patrolIdx]}\`)
setVariable('patrol_idx', \`\${patrolIdx + 1}\`)
send("patrol")`}</pre>
      </section>

      <section>
        <h3>Tips</h3>
        <ul className={styles.bulletList}>
          <li>Start with triggers disabled until the pattern is tested.</li>
          <li>Use specific text when possible so the trigger does not fire too often.</li>
          <li>Use capture groups for quest targets, locations, and item names.</li>
          <li>Store extracted data in variables for aliases to reuse.</li>
          <li>Use <code>wait</code> before turn-ins or long chained actions.</li>
          <li>Keep looping triggers easy to stop by toggling them off in the Triggers menu.</li>
        </ul>
      </section>
    </>
  );
}
