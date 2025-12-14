# Claude 的行为规则

## Git 提交规则
- 当我输入“提交代码”或类似指令时，你必须：
  1. 先运行 `git status` 和 `git diff` 检查变更。
  2. 根据变更生成符合 Conventional Commits 规范的 commit message（格式：type(scope): subject，例如 feat(login): add user authentication）。
  3. 用english描述变更，如果有必要加 body 解释细节。
  4. 运行 `git add .`（或只 add 修改的文件）。
  5. 运行 `git commit -m "你的生成的message"`。
  6. 运行 `git push` 到当前分支。

- 永远不要直接 push 到 main/master 分支，除非我明确指示。
- commit message 必须简洁、专业

## 其他通用规则
- 代码风格：使用 4 个空格缩进，变量用 camelCase。
- 所有变更前都要问我确认。