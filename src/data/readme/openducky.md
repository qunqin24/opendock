# openducky 
![npm downloads](https://img.shields.io/npm/dw/openducky)
![npm](https://img.shields.io/npm/v/openducky)


Rubber duck debugging quiz plugin for [OpenCode](https://opencode.ai).

Test your understanding of code through interactive quizzes - the AI reads a file and quizzes you on it, one question at a time.

<div align="center">
<img width="400" height="315" alt="image" src="https://github.com/user-attachments/assets/2022963c-7540-40d4-8005-d70b33ea6987" />
<br/>
<img width="400" height="166" alt="image" src="https://github.com/user-attachments/assets/0e41f66a-aca5-418b-9067-950edec25353" />
<br/>
<img width="400" height="346" alt="image" src="https://github.com/user-attachments/assets/f13039bd-c47c-4d75-b160-afc5b0b43e23" />
<br/>
</div>

## Installation

Add to your `opencode.json`:

```json
{
  "plugin": ["openducky"]
}
```

## Usage

Just ask to be quizzed on any file:

```
ducky
```

```
Quiz me on src/index.ts
```

```
Use ducky to test my understanding of the auth module
```

OpenCode will prompt you to select a file and quiz mode, then begin the interactive quiz.

## Quiz Flow

1. **Select a file** - Choose which file you want to be quizzed on
2. **Choose a mode** - Skim (high-level) or Full (implementation details)
3. **Answer questions** - 3-5 questions presented one at a time
4. **Get feedback** - Each answer is evaluated with corrections if needed
5. **Review summary** - Final assessment of your understanding

## Modes

| Mode | Focus |
|------|-------|
| **Skim** | Purpose, architecture, exports, interfaces, what the code does overall |
| **Full** | Logic flow, edge cases, error handling, why specific decisions were made |

## Topic Focus (Optional)

Narrow the quiz to a specific aspect:

```
Quiz me on src/api.ts, focus on error handling
```

```
Test my understanding of the caching logic in utils.ts
```

## License

MIT
