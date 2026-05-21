import React from 'react';
import styles from '../styles.module.css';

export function VariablesGuide() {
  return (
    <>
      <section>
        <h2>Using Variables</h2>
        <p>
          Variables are named values saved in the client. They are useful for
          anything you reuse often: travel paths, quest targets, locations,
          current skill names, equipment ids, counters, or temporary state.
        </p>
        <p>
          Open <strong>Variables</strong> from the client menu, add a row, then
          enter a <strong>Name</strong> and <strong>Value</strong>. Save the
          row before using it in aliases, triggers, or scripts.
        </p>
      </section>

      <section>
        <h3>Naming Variables</h3>
        <p>
          Use short, descriptive names with letters, numbers, and underscores.
          Names like <code>path_daimiao</code>, <code>quest_target</code>, and
          <code>curr_skill</code> are easy to scan and safe to use from scripts.
        </p>
        <div className={styles.codeTable}>
          <div>
            <strong>Prefix</strong>
            <strong>Use</strong>
          </div>
          <div>
            <code>path_</code>
            <span>Saved speedwalk routes, such as <code>path_laowu</code>.</span>
          </div>
          <div>
            <code>patrol_</code>
            <span>Patrol setup, route, or index values.</span>
          </div>
          <div>
            <code>quest_</code>
            <span>Current quest target, location, or command type.</span>
          </div>
          <div>
            <code>curr_</code>
            <span>Current skill or basic skill being trained.</span>
          </div>
        </div>
      </section>

      <section>
        <h3>Common Examples</h3>
        <p>
          Path variables can store comma-separated movement steps for
          <code>speedwalk</code>. Text variables can store Chinese NPC names,
          locations, item ids, or command fragments.
        </p>
        <pre className={styles.codeBlock}>{`path_daimiao = 4n,nw,n,ne,5n,3e,3s,e,3ne,n,2ne,7n
patrol_xg_path = sd,wd,wd,w,w,e,e,s,s,s,su,sd,s,n,nu,nd,e,ne,ne,ne,n,ne
quest_target = 拓跋高
quest_location = 白云岛
quest_type = show letter
curr_skill = luohan-quan
weapon = ironfist`}</pre>
      </section>

      <section>
        <h3>Using Variables In Automation</h3>
        <p>
          Variables are exposed by name inside alias, trigger, and script code.
          For example, if you create <code>path_daimiao</code>, your automation
          can refer to <code>path_daimiao</code> directly.
        </p>
        <pre className={styles.codeBlock}>{`speedwalk(path_daimiao)
send("ask " + quest_target + " about " + quest_location)
send("enable " + curr_basic + " " + curr_skill)
send("wield " + weapon)`}</pre>
      </section>

      <section>
        <h3>Updating Variables From Automation</h3>
        <p>
          Use <code>setVariable(name, value)</code> when a trigger or script
          needs to remember new state, such as a patrol index, destination, or
          repeated action count.
        </p>
        <pre className={styles.codeBlock}>{`setVariable("patrol_idx", "18")
setVariable("destination", "baiyun")
setVariable("swingCount", String(Number(swingCount) + 1))`}</pre>
      </section>

      <section>
        <h3>Variables And Scripts</h3>
        <p>
          Scripts use the same variables as aliases and triggers. A trigger can
          save quest data, then call a script with <code>sendEvent</code> to run
          shared logic against those values.
        </p>
        <pre className={styles.codeBlock}>{`// Trigger command
setVariable('quest_target', matches[1])
setVariable('quest_location', matches[2])
sendEvent('report_quest')

// Script command for event: report_quest
send(\`say target: \${quest_target}\`)
send(\`say location: \${quest_location}\`)`}</pre>
      </section>

      <section>
        <h3>Tips</h3>
        <ul className={styles.bulletList}>
          <li>Store values exactly as the command should use them.</li>
          <li>Use comma-separated paths for speedwalk routes.</li>
          <li>Use strings for numbers, then convert them in scripts when needed.</li>
          <li>Avoid spaces in variable names; use underscores instead.</li>
          <li>Keep route variables small enough that you can inspect and fix them quickly.</li>
        </ul>
      </section>
    </>
  );
}
