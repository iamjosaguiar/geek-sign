// Expression evaluator for workflow conditions
import { WorkflowContext } from "./context";

export type ComparisonOperator = "==" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "in";
export type LogicalOperator = "AND" | "OR" | "NOT";

export interface Expression {
  type: "comparison" | "logical" | "value" | "function";
  operator?: ComparisonOperator | LogicalOperator;
  left?: Expression;
  right?: Expression;
  value?: any;
  functionName?: string;
  args?: Expression[];
}

export class ExpressionEvaluator {
  private context: WorkflowContext;

  constructor(context: WorkflowContext) {
    this.context = context;
  }

  // Main evaluation entry point
  evaluate(expression: string): any {
    const parsed = this.parse(expression);
    return this.evaluateExpression(parsed);
  }

  // Parse expression string into AST
  private parse(expression: string): Expression {
    const trimmed = expression.trim();

    // Handle logical operators (AND, OR)
    const andMatch = this.splitByOperator(trimmed, "AND");
    if (andMatch) {
      return {
        type: "logical",
        operator: "AND",
        left: this.parse(andMatch.left),
        right: this.parse(andMatch.right),
      };
    }

    const orMatch = this.splitByOperator(trimmed, "OR");
    if (orMatch) {
      return {
        type: "logical",
        operator: "OR",
        left: this.parse(orMatch.left),
        right: this.parse(orMatch.right),
      };
    }

    // Handle NOT operator
    if (trimmed.startsWith("NOT ")) {
      return {
        type: "logical",
        operator: "NOT",
        right: this.parse(trimmed.substring(4)),
      };
    }

    // Handle parentheses
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      return this.parse(trimmed.substring(1, trimmed.length - 1));
    }

    // Handle comparison operators
    for (const op of ["==", "!=", ">=", "<=", ">", "<", "contains", "in"]) {
      const parts = this.splitByOperator(trimmed, op);
      if (parts) {
        return {
          type: "comparison",
          operator: op as ComparisonOperator,
          left: this.parseValue(parts.left),
          right: this.parseValue(parts.right),
        };
      }
    }

    // If no operators, parse as value
    return this.parseValue(trimmed);
  }

  // Parse a value (variable, literal, or function call)
  private parseValue(value: string): Expression {
    const trimmed = value.trim();

    // Check for function call
    const funcMatch = trimmed.match(/^(\w+)\((.*)\)$/);
    if (funcMatch) {
      const [, functionName, argsStr] = funcMatch;
      const args = argsStr
        .split(",")
        .filter((a) => a.trim())
        .map((a) => this.parseValue(a));
      return {
        type: "function",
        functionName,
        args,
      };
    }

    // Check for string literal
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return {
        type: "value",
        value: trimmed.substring(1, trimmed.length - 1),
      };
    }

    // Check for number literal
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return {
        type: "value",
        value: parseFloat(trimmed),
      };
    }

    // Check for boolean literal
    if (trimmed === "true" || trimmed === "false") {
      return {
        type: "value",
        value: trimmed === "true",
      };
    }

    // Otherwise, treat as variable reference
    return {
      type: "value",
      value: this.context.evaluate(trimmed),
    };
  }

  // Split expression by operator (handles precedence)
  private splitByOperator(
    expr: string,
    operator: string
  ): { left: string; right: string } | null {
    let depth = 0;
    let inString = false;
    let stringChar = "";

    // Find the operator at depth 0 (not inside parentheses or strings)
    for (let i = 0; i < expr.length; i++) {
      const char = expr[i];

      // Handle strings
      if ((char === '"' || char === "'") && !inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar && inString) {
        inString = false;
        stringChar = "";
      }

      if (inString) continue;

      // Handle parentheses
      if (char === "(") depth++;
      if (char === ")") depth--;

      // Check for operator at depth 0
      if (depth === 0 && expr.substring(i).startsWith(operator)) {
        // Make sure it's a word boundary for word operators
        if (operator.match(/^[A-Z]+$/)) {
          const before = i === 0 || /\s/.test(expr[i - 1]);
          const after =
            i + operator.length >= expr.length ||
            /\s/.test(expr[i + operator.length]);
          if (!before || !after) continue;
        }

        return {
          left: expr.substring(0, i).trim(),
          right: expr.substring(i + operator.length).trim(),
        };
      }
    }

    return null;
  }

  // Evaluate parsed expression
  private evaluateExpression(expr: Expression): any {
    switch (expr.type) {
      case "value":
        return expr.value;

      case "comparison":
        return this.evaluateComparison(expr);

      case "logical":
        return this.evaluateLogical(expr);

      case "function":
        return this.evaluateFunction(expr);

      default:
        throw new Error(`Unknown expression type: ${expr.type}`);
    }
  }

  // Evaluate comparison expression
  private evaluateComparison(expr: Expression): boolean {
    const left = this.evaluateExpression(expr.left!);
    const right = this.evaluateExpression(expr.right!);

    switch (expr.operator) {
      case "==":
        return left == right;
      case "!=":
        return left != right;
      case ">":
        return left > right;
      case "<":
        return left < right;
      case ">=":
        return left >= right;
      case "<=":
        return left <= right;
      case "contains":
        if (typeof left === "string" && typeof right === "string") {
          return left.includes(right);
        }
        if (Array.isArray(left)) {
          return left.includes(right);
        }
        return false;
      case "in":
        if (Array.isArray(right)) {
          return right.includes(left);
        }
        if (typeof right === "string" && typeof left === "string") {
          return right.includes(left);
        }
        return false;
      default:
        throw new Error(`Unknown comparison operator: ${expr.operator}`);
    }
  }

  // Evaluate logical expression
  private evaluateLogical(expr: Expression): boolean {
    switch (expr.operator) {
      case "AND":
        return (
          this.evaluateExpression(expr.left!) &&
          this.evaluateExpression(expr.right!)
        );
      case "OR":
        return (
          this.evaluateExpression(expr.left!) ||
          this.evaluateExpression(expr.right!)
        );
      case "NOT":
        return !this.evaluateExpression(expr.right!);
      default:
        throw new Error(`Unknown logical operator: ${expr.operator}`);
    }
  }

  // Evaluate function call
  private evaluateFunction(expr: Expression): any {
    const functionName = expr.functionName!;
    const args = (expr.args || []).map((arg) => this.evaluateExpression(arg));

    switch (functionName) {
      case "length":
        return this.helperLength(args[0]);
      case "toUpperCase":
        return this.helperToUpperCase(args[0]);
      case "toLowerCase":
        return this.helperToLowerCase(args[0]);
      case "trim":
        return this.helperTrim(args[0]);
      case "isEmpty":
        return this.helperIsEmpty(args[0]);
      case "startsWith":
        return this.helperStartsWith(args[0], args[1]);
      case "endsWith":
        return this.helperEndsWith(args[0], args[1]);
      case "substring":
        return this.helperSubstring(args[0], args[1], args[2]);
      case "replace":
        return this.helperReplace(args[0], args[1], args[2]);
      case "split":
        return this.helperSplit(args[0], args[1]);
      case "join":
        return this.helperJoin(args[0], args[1]);
      case "concat":
        return this.helperConcat(...args);
      case "round":
        return this.helperRound(args[0]);
      case "floor":
        return this.helperFloor(args[0]);
      case "ceil":
        return this.helperCeil(args[0]);
      case "abs":
        return this.helperAbs(args[0]);
      case "min":
        return this.helperMin(...args);
      case "max":
        return this.helperMax(...args);
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }
  }

  // Helper functions
  private helperLength(value: any): number {
    if (typeof value === "string" || Array.isArray(value)) {
      return value.length;
    }
    return 0;
  }

  private helperToUpperCase(value: any): string {
    return String(value).toUpperCase();
  }

  private helperToLowerCase(value: any): string {
    return String(value).toLowerCase();
  }

  private helperTrim(value: any): string {
    return String(value).trim();
  }

  private helperIsEmpty(value: any): boolean {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  }

  private helperStartsWith(value: any, search: any): boolean {
    return String(value).startsWith(String(search));
  }

  private helperEndsWith(value: any, search: any): boolean {
    return String(value).endsWith(String(search));
  }

  private helperSubstring(value: any, start: number, end?: number): string {
    return String(value).substring(start, end);
  }

  private helperReplace(value: any, search: any, replace: any): string {
    return String(value).replace(String(search), String(replace));
  }

  private helperSplit(value: any, separator: any): string[] {
    return String(value).split(String(separator));
  }

  private helperJoin(array: any[], separator: string = ","): string {
    if (!Array.isArray(array)) return String(array);
    return array.join(separator);
  }

  private helperConcat(...values: any[]): string {
    return values.map(String).join("");
  }

  private helperRound(value: any): number {
    return Math.round(Number(value));
  }

  private helperFloor(value: any): number {
    return Math.floor(Number(value));
  }

  private helperCeil(value: any): number {
    return Math.ceil(Number(value));
  }

  private helperAbs(value: any): number {
    return Math.abs(Number(value));
  }

  private helperMin(...values: any[]): number {
    return Math.min(...values.map(Number));
  }

  private helperMax(...values: any[]): number {
    return Math.max(...values.map(Number));
  }
}

// Convenience function for quick evaluation
export function evaluateCondition(
  expression: string,
  context: WorkflowContext
): boolean {
  const evaluator = new ExpressionEvaluator(context);
  return evaluator.evaluate(expression);
}
