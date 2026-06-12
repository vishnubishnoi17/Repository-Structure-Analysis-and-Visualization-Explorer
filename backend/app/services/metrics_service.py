import ast
import re
from pathlib import Path
from typing import Optional


class MetricsService:
    def analyze_file(self, file_path: str) -> dict:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        content = path.read_text(encoding="utf-8", errors="replace")
        ext = path.suffix.lower()

        base = self._base_metrics(content, ext)
        complexity = self._complexity(content, ext)

        return {
            "file_path": file_path,
            "filename": path.name,
            "extension": ext,
            **base,
            **complexity,
        }

    def _base_metrics(self, content: str, ext: str) -> dict:
        lines = content.splitlines()
        total = len(lines)
        blank = sum(1 for l in lines if not l.strip())
        comment = self._count_comments(lines, ext)
        code = total - blank - comment

        return {
            "loc_total": total,
            "loc_code": max(code, 0),
            "loc_comment": comment,
            "loc_blank": blank,
            "char_count": len(content),
        }

    def _count_comments(self, lines: list[str], ext: str) -> int:
        count = 0
        if ext == ".py":
            for l in lines:
                s = l.strip()
                if s.startswith("#") or s.startswith('"""') or s.startswith("'''"):
                    count += 1
        elif ext in {".js", ".ts", ".jsx", ".tsx", ".java", ".go", ".c", ".cpp", ".h", ".hpp"}:
            in_block = False
            for l in lines:
                s = l.strip()
                if "/*" in s:
                    in_block = True
                if in_block:
                    count += 1
                if "*/" in s:
                    in_block = False
                    continue
                if not in_block and s.startswith("//"):
                    count += 1
        return count

    def _complexity(self, content: str, ext: str) -> dict:
        if ext == ".py":
            return self._python_complexity(content)
        elif ext in {".js", ".ts", ".jsx", ".tsx"}:
            return self._js_complexity(content)
        return {"cyclomatic_complexity": None, "function_count": None, "class_count": None}

    def _python_complexity(self, content: str) -> dict:
        try:
            tree = ast.parse(content)
        except SyntaxError:
            return {"cyclomatic_complexity": None, "function_count": 0, "class_count": 0}

        functions = [n for n in ast.walk(tree) if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]
        classes = [n for n in ast.walk(tree) if isinstance(n, ast.ClassDef)]

        # Cyclomatic complexity: 1 + decision points
        decision_nodes = (
            ast.If, ast.While, ast.For, ast.AsyncFor,
            ast.ExceptHandler, ast.With, ast.AsyncWith,
            ast.Assert, ast.comprehension,
        )
        decisions = sum(1 for n in ast.walk(tree) if isinstance(n, decision_nodes))

        return {
            "cyclomatic_complexity": 1 + decisions,
            "function_count": len(functions),
            "class_count": len(classes),
        }

    def _js_complexity(self, content: str) -> dict:
        # Regex-based (no full AST for JS in stdlib)
        function_patterns = [
            r"\bfunction\s+\w+\s*\(",
            r"\bconst\s+\w+\s*=\s*(?:async\s*)?\(",
            r"\bconst\s+\w+\s*=\s*(?:async\s*)?\w+\s*=>",
            r"\b(?:async\s+)?function\*?\s*\(",
        ]
        func_count = sum(len(re.findall(p, content)) for p in function_patterns)

        class_count = len(re.findall(r"\bclass\s+\w+", content))

        # Decision points for cyclomatic complexity
        decisions = len(re.findall(
            r"\b(?:if|else if|while|for|switch|case|\?\s*:|\&\&|\|\|)\b", content
        ))

        return {
            "cyclomatic_complexity": 1 + decisions,
            "function_count": func_count,
            "class_count": class_count,
        }
