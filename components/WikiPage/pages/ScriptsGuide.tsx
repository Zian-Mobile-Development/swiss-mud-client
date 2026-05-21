import React from 'react';
import styles from '../styles.module.css';

export function ScriptsGuide() {
  return (
    <>
      <section>
        <h2>Writing Scripts</h2>
        <p>
          Scripts are reusable event handlers. They do not run by themselves.
          An alias or trigger must call <code>sendEvent('eventName')</code>, and
          the client will run the first enabled script whose <strong>Event</strong>
          matches that name.
        </p>
        <p>
          Scripts receive the same helper functions as aliases and triggers:
          <code>send</code>, <code>sendAll</code>, <code>wait</code>,
          <code>speedwalk</code>, <code>alert</code>, <code>setVariable</code>,
          and <code>sendEvent</code>. Saved variables are also available by name.
        </p>
      </section>

      <section>
        <h3>Script Shape</h3>
        <div className={styles.codeTable}>
          <div>
            <strong>Field</strong>
            <strong>Purpose</strong>
          </div>
          <div>
            <code>name</code>
            <span>A label in the Scripts list, such as <code>打招呼</code>.</span>
          </div>
          <div>
            <code>event</code>
            <span>The event name passed to <code>sendEvent</code>.</span>
          </div>
          <div>
            <code>command</code>
            <span>JavaScript code that runs when the event is sent.</span>
          </div>
          <div>
            <code>enabled</code>
            <span>Disabled scripts are skipped.</span>
          </div>
        </div>
      </section>

      <section>
        <h3>Hello Script</h3>
        <p>
          Your sample script listens for the <code>greeting</code> event and
          sends one command.
        </p>
        <pre className={styles.codeBlock}>{`// Script
name: 打招呼
event: greeting
command:
send("say hi")

// Alias or trigger that runs it
sendEvent('greeting')`}</pre>
      </section>

      <section>
        <h3>Run A Script From An Alias</h3>
        <p>
          Use scripts when several aliases or triggers should share the same
          command sequence.
        </p>
        <pre className={styles.codeBlock}>{`// Script
name: 准备装备
event: prepare_gear
command:
send("unwield all")
send(\`wield \${weapon}\`)
send("wear all")

// Alias
pattern: ^gear$
command:
sendEvent('prepare_gear')`}</pre>
      </section>

      <section>
        <h3>Use Variables In A Script</h3>
        <p>
          Scripts can read variables directly by name and update variables with
          <code>setVariable</code>.
        </p>
        <pre className={styles.codeBlock}>{`// Script
name: 当前任务
event: report_quest
command:
send(\`say target: \${quest_target}\`)
send(\`say location: \${quest_location} / \${quest_location_2}\`)
send(\`say type: \${quest_type}\`)

// Trigger after parsing a quest
sendEvent('report_quest')`}</pre>
      </section>

      <section>
        <h3>Chained Events</h3>
        <p>
          Scripts can call <code>sendEvent</code> too. This lets you compose
          small scripts into a longer workflow.
        </p>
        <pre className={styles.codeBlock}>{`// Script
name: 任务开始
event: quest_start
command:
setVariable('patrol_idx', '0')
sendEvent('prepare_gear')
send('quest1')

// Script
name: 准备装备
event: prepare_gear
command:
send("unwield all")
send(\`wield \${weapon}\`)
send("wear all")`}</pre>
      </section>

      <section>
        <h3>Waits And Routes</h3>
        <p>
          Scripts can use <code>wait</code> and <code>speedwalk</code>. Wait
          time is in milliseconds. Speedwalk delay is in seconds between steps.
        </p>
        <pre className={styles.codeBlock}>{`// Script
name: 去任务地点
event: go_destination
command:
if (destination === 'baiyun') {
  speedwalk(path_qp, false, 0.5)
  wait(2000)
  send('ask zhanggui about boat')
} else {
  send(\`say unknown destination: \${destination}\`)
}`}</pre>
      </section>

      <section>
        <h3>Important Limits</h3>
        <ul className={styles.bulletList}>
          <li>Scripts only run from <code>sendEvent</code>; the event name is matched against the script <code>event</code> field.</li>
          <li>Only enabled scripts run.</li>
          <li>If multiple enabled scripts have the same event, only the first match is used.</li>
          <li>Scripts do not receive <code>matches</code>; pass needed data through variables first.</li>
          <li>Use short event names like <code>greeting</code>, <code>prepare_gear</code>, or <code>report_quest</code>.</li>
        </ul>
      </section>
    </>
  );
}
