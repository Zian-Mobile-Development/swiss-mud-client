// engines/PatternEngine.ts
// Engine for processing patterns.

import type { Variable, Command, Pattern, PatternContext, Script } from '../types';
import { parseSpeedwalk } from '../utils/CommandUtils';
import { alert } from '../utils/CommandAction';
import {
  colorOfText,
  extractColoredSegments,
  hasColoredText,
} from '../utils/ColorTriggerUtils';

export function processPatterns(
  input: string,
  patterns: Pattern[],
  variables: Variable[] = [],
  setVariable?: (name: string, value: string) => void,
  scripts?: Script[],
  context: PatternContext = {}
): Command[] | null {
  let allCommands: Command[] = [];
  const rawHtml = context.rawHtml || '';
  const coloredSegments =
    context.coloredSegments || extractColoredSegments(rawHtml);

  for (const patternObj of patterns) {
    if (!patternObj.enabled) continue;
    const regex = new RegExp(patternObj.pattern);
    const match = input.match(regex);
    if (match) {
      const capturedCommands: Command[] = [];

      // Helper functions
      const send = (command: string) => {
        capturedCommands.push({ type: 'command' as const, content: command });
      };

      const sendAll = (...commands: string[]) => {
        commands.forEach(command => {
          capturedCommands.push({
            type: 'command' as const,
            content: command,
          });
        });
      };

      const wait = (ms: number) => {
        capturedCommands.push({ type: 'wait', content: '', waitTime: ms });
        return Promise.resolve();
      };

      const speedwalk = (
        actions: string,
        backwards: boolean = false,
        delay: number = 0
      ) => {
        const directionCommands = parseSpeedwalk(actions, backwards);
        for (let i = 0; i < directionCommands.length; i++) {
          capturedCommands.push({
            type: 'command' as const,
            content: directionCommands[i],
          });
          if (delay > 0 && i < directionCommands.length - 1) {
            capturedCommands.push({
              type: 'wait',
              content: '',
              waitTime: delay * 1000, // convert seconds to ms
            });
          }
        }
      };

      const sendEvent = (eventName: string) => {
        if (!scripts) return;
        const script = scripts.find(s => s.enabled && s.event === eventName);
        if (!script) {
          console.warn(`No script found for event: ${eventName}`);
          return;
        }
        try {
          // Create a sandbox with all available functions and variables
          const sandbox: any = {
            send,
            sendAll,
            wait,
            speedwalk,
            alert,
            setVariable: setVariable || (() => {}),
            sendEvent,
            rawHtml,
            coloredSegments,
            hasColoredText: (text: string, color?: string) =>
              hasColoredText(coloredSegments, text, color),
            colorOfText: (text: string) => colorOfText(coloredSegments, text),
          };

          // Add variables to sandbox
          variables.forEach(variable => {
            if (variable.name && !(variable.name in sandbox)) {
              Object.defineProperty(sandbox, variable.name, {
                get: () => variable.value,
                enumerable: true,
                configurable: true,
              });
            }
          });

          // eslint-disable-next-line no-new-func
          const fn = new Function(...Object.keys(sandbox), script.command);
          fn(...Object.values(sandbox));
        } catch (err) {
          console.error(
            `Failed to execute script for event '${eventName}':`,
            err
          );
        }
      };

      // Prepare sandbox
      const sandbox: any = {
        matches: match,
        send,
        sendAll,
        wait,
        speedwalk,
        alert,
        setVariable: setVariable || (() => {}),
        sendEvent,
        rawHtml,
        coloredSegments,
        hasColoredText: (text: string, color?: string) =>
          hasColoredText(coloredSegments, text, color),
        colorOfText: (text: string) => colorOfText(coloredSegments, text),
      };

      variables.forEach(variable => {
        if (variable.name && !(variable.name in sandbox)) {
          Object.defineProperty(sandbox, variable.name, {
            get: () => variable.value,
            enumerable: true,
            configurable: true,
          });
        }
      });

      // Prepare code
      const lines = patternObj.command
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean);
      const patternFunction = new Function(
        ...Object.keys(sandbox),
        `"use strict";\n${lines.join('\n')}`
      );
      try {
        patternFunction(...Object.values(sandbox));
        if (capturedCommands.length > 0) {
          allCommands = allCommands.concat(capturedCommands);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(`Error executing:`, error.message);
        } else {
          console.error(`Error executing:`, error);
        }
      }
    }
  }
  return allCommands.length > 0 ? allCommands : null;
}
