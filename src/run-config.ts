import * as vscode from 'vscode';
import * as path from 'path';

// keep the file name without extensions
const getdefaultLogFileName = (editor: vscode.TextEditor | undefined) =>{ return editor ? path.basename(editor.document.fileName.slice(0, editor.document.fileName.lastIndexOf('.'))) + '.log' : 'default.log';}
const defaultLogFilePath = './';
const defaultLogLevel = 'debug';
const defaultFormat = '%(asctime)s - %(name)s - %(levelname)s - %(message)s';

const initial_prompt = `As a professional Python developer, your task is to enhance the given Python code only by adding comprehensive logging. The logging should be implemented using Python's 'logging' module. Ensure that the logging captures key events, errors, and information at appropriate levels (debug, info, warning, error, critical) to aid in debugging and monitoring the program's behavior. Here is the code:

<CODE>

Please add logging to the above code following best practices in Python programming. you are allowed only to add logging statments and not modify the existing code including simple print commands if they are needed for user interuction. responed only with python code.
`

const not_valid_prompt = `provide the full code and note that you are allowed only to add logging statments and not modify the existing code.`

export { getdefaultLogFileName, defaultLogFilePath, defaultLogLevel, defaultFormat, initial_prompt, not_valid_prompt};