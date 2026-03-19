import json
import ast
import hashlib
import math
import operator
import random
from urllib import error, request

from django.conf import settings


class QuestionGenerationError(Exception):
    pass


SAFE_BINARY_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

SAFE_UNARY_OPERATORS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

SAFE_COMPARE_OPERATORS = {
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
}

SAFE_FUNCTIONS = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "int": int,
    "sqrt": math.sqrt,
}

DIFFICULTY_SCALE = {
    "easy": (0.35, 0.55),
    "medium": (0.5, 0.8),
    "hard": (0.75, 1.0),
}

DIFFICULTY_TO_LEVEL = {
    "easy": 1,
    "medium": 3,
    "hard": 5,
}


def safe_eval_expression(expression, variables):
    def evaluate(node):
        if isinstance(node, ast.Expression):
            return evaluate(node.body)
        if isinstance(node, ast.Constant):
            return node.value
        if isinstance(node, ast.Name):
            if node.id not in variables:
                raise QuestionGenerationError(f"Unknown variable '{node.id}' in template expression.")
            return variables[node.id]
        if isinstance(node, ast.BinOp):
            operator_fn = SAFE_BINARY_OPERATORS.get(type(node.op))
            if not operator_fn:
                raise QuestionGenerationError("Unsupported operator in template formula.")
            return operator_fn(evaluate(node.left), evaluate(node.right))
        if isinstance(node, ast.UnaryOp):
            operator_fn = SAFE_UNARY_OPERATORS.get(type(node.op))
            if not operator_fn:
                raise QuestionGenerationError("Unsupported unary operator in template formula.")
            return operator_fn(evaluate(node.operand))
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name) or node.func.id not in SAFE_FUNCTIONS:
                raise QuestionGenerationError("Unsupported function in template formula.")
            return SAFE_FUNCTIONS[node.func.id](*[evaluate(arg) for arg in node.args])
        if isinstance(node, ast.Compare):
            left = evaluate(node.left)
            for operator_node, comparator in zip(node.ops, node.comparators):
                operator_fn = SAFE_COMPARE_OPERATORS.get(type(operator_node))
                if not operator_fn:
                    raise QuestionGenerationError("Unsupported comparison in template formula.")
                right = evaluate(comparator)
                if not operator_fn(left, right):
                    return False
                left = right
            return True
        if isinstance(node, ast.BoolOp):
            if isinstance(node.op, ast.And):
                return all(evaluate(value) for value in node.values)
            if isinstance(node.op, ast.Or):
                return any(evaluate(value) for value in node.values)
            raise QuestionGenerationError("Unsupported boolean operator in template formula.")
        raise QuestionGenerationError("Unsupported expression in template formula.")

    try:
        parsed = ast.parse(str(expression), mode="eval")
    except SyntaxError as exc:
        raise QuestionGenerationError("Template formula is not valid.") from exc
    return evaluate(parsed)


def _pick_range_value(minimum, maximum, difficulty):
    lower, upper = DIFFICULTY_SCALE.get(difficulty, DIFFICULTY_SCALE["medium"])
    span = max(int(maximum) - int(minimum), 0)
    scaled_min = int(int(minimum) + span * lower)
    scaled_max = int(int(minimum) + span * upper)
    if scaled_max < scaled_min:
        scaled_max = scaled_min
    return random.randint(scaled_min, scaled_max)


def _resolve_schema_number(value, resolved):
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return safe_eval_expression(value, resolved)
    raise QuestionGenerationError("Variable bounds must be numbers or resolvable expressions.")


def _pick_schema_value(config, difficulty, resolved):
    minimum = _resolve_schema_number(config.get("min", 0), resolved)
    maximum = _resolve_schema_number(config.get("max", minimum), resolved)
    if maximum < minimum:
        raise QuestionGenerationError("Variable max cannot be smaller than min.")

    integer_only = bool(config.get("integer_only", True))
    allow_zero = bool(config.get("allow_zero", True))
    allow_negative = bool(config.get("allow_negative", True))
    step = config.get("step", 1 if integer_only else 0.1)
    step = _resolve_schema_number(step, resolved)
    if step <= 0:
        raise QuestionGenerationError("Variable step must be greater than zero.")

    lower_ratio, upper_ratio = DIFFICULTY_SCALE.get(difficulty, DIFFICULTY_SCALE["medium"])
    span = maximum - minimum
    scaled_min = minimum + (span * lower_ratio)
    scaled_max = minimum + (span * upper_ratio)
    if scaled_max < scaled_min:
        scaled_max = scaled_min

    if integer_only:
        step = max(int(step), 1)
        start = math.ceil(scaled_min)
        end = math.floor(scaled_max)
        if start > end:
            start = end = round(scaled_min)
        candidates = list(range(int(start), int(end) + 1, step))
        if not candidates:
            candidates = [int(round(start))]
    else:
        total_steps = max(int(math.floor((scaled_max - scaled_min) / step)), 0)
        index = random.randint(0, total_steps) if total_steps > 0 else 0
        value = scaled_min + (index * step)
        candidates = [round(value, 10)]

    filtered = [
        candidate
        for candidate in candidates
        if (allow_negative or candidate >= 0) and (allow_zero or candidate != 0)
    ]
    if not filtered:
        raise QuestionGenerationError("Variable constraints leave no valid values to generate.")

    choice = random.choice(filtered)
    if isinstance(choice, float) and choice.is_integer():
        return int(choice)
    return choice


def resolve_template_variables(variable_schema, difficulty):
    resolved = {}
    pending = dict(variable_schema or {})
    guard = 0
    while pending and guard < 20:
        guard += 1
        progressed = False
        for key in list(pending.keys()):
            value = pending[key]
            try:
                if isinstance(value, dict) and {"min", "max"}.issubset(set(value.keys())):
                    resolved[key] = _pick_schema_value(value, difficulty, resolved)
                elif isinstance(value, list) and len(value) == 2 and all(isinstance(item, (int, float)) for item in value):
                    resolved[key] = _pick_range_value(value[0], value[1], difficulty)
                elif isinstance(value, (int, float)):
                    resolved[key] = value
                elif isinstance(value, str):
                    resolved[key] = safe_eval_expression(value, resolved)
                else:
                    resolved[key] = value
                pending.pop(key)
                progressed = True
            except QuestionGenerationError:
                continue
        if not progressed:
            break
    if pending:
        unresolved = ", ".join(sorted(pending.keys()))
        raise QuestionGenerationError(f"Could not resolve template variables: {unresolved}.")
    return resolved


def validate_template_constraints(constraints, variables):
    for expression in constraints or []:
        result = safe_eval_expression(expression, variables)
        if not bool(result):
            return False
    return True


def render_template_text(template_text, variables):
    try:
        return str(template_text).format(**variables)
    except KeyError as exc:
        raise QuestionGenerationError(f"Missing variable '{exc.args[0]}' in template text.") from exc


def build_mcq_options(answer, distractor_logic=None, variables=None):
    if isinstance(answer, float) and answer.is_integer():
        answer = int(answer)

    if distractor_logic:
        options = []
        correct_text = str(answer)
        options.append({"option_text": correct_text, "is_correct": True, "display_order": 1})
        seen = {correct_text}
        for expression in distractor_logic:
            try:
                value = safe_eval_expression(expression, variables or {})
            except QuestionGenerationError:
                continue
            if isinstance(value, float) and value.is_integer():
                value = int(value)
            option_text = str(value)
            if option_text in seen:
                continue
            seen.add(option_text)
            options.append({"option_text": option_text, "is_correct": False, "display_order": len(options) + 1})
        if len(options) >= 4:
            random.shuffle(options)
            for index, option in enumerate(options[:4], start=1):
                option["display_order"] = index
            return options[:4]

    if not isinstance(answer, (int, float)):
        return [
            {"option_text": str(answer), "is_correct": True, "display_order": 1},
            {"option_text": f"not {answer}", "is_correct": False, "display_order": 2},
            {"option_text": f"{answer} + 1", "is_correct": False, "display_order": 3},
            {"option_text": f"{answer} - 1", "is_correct": False, "display_order": 4},
        ]

    distance = max(2, abs(int(answer)) // 5 or 2)
    distractors = {answer + distance, answer - distance, answer + (distance * 2)}
    cleaned = [answer, *[value for value in distractors if value != answer]]
    while len(cleaned) < 4:
        cleaned.append(answer + len(cleaned) + 1)

    random.shuffle(cleaned)
    return [
        {"option_text": str(value), "is_correct": value == answer, "display_order": index}
        for index, value in enumerate(cleaned[:4], start=1)
    ]


def make_generation_hash(prompt, concept_id, secondary_concept_id, template_id):
    payload = f"{template_id}|{concept_id}|{secondary_concept_id or ''}|{prompt.strip().lower()}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def generate_question_with_gemini(*, subject_name, concept_name, question_type, exam_type, prompt_seed):
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        raise QuestionGenerationError("Gemini API key is not configured.")

    exam_scope = ", ".join(exam_type) if exam_type else "General"
    prompt = (
        "You are an expert question setter for Indian school and competitive exam prep. "
        "Generate exactly one question as strict JSON with keys: prompt, explanation, options. "
        "options must be an array. Each option must be an object with keys: option_text, is_correct, display_order. "
        "If question_type is numeric, options must be an empty array. "
        "If question_type is mcq_single, provide exactly 4 options with exactly 1 correct option. "
        "If question_type is mcq_multi, provide 4 to 5 options with at least 2 correct options. "
        "Keep the wording student-friendly and aligned to the requested exam scope.\n\n"
        f"Subject: {subject_name}\n"
        f"Concept: {concept_name}\n"
        f"Question type: {question_type}\n"
        f"Exam scope: {exam_scope}\n"
        f"Question brief: {prompt_seed}\n"
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.35,
            "responseMimeType": "application/json",
        },
    }

    endpoint = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    http_request = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=20) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        raise QuestionGenerationError(
            f"Gemini request failed with status {exc.code}: {detail or 'No response body.'}"
        ) from exc
    except error.URLError as exc:
        raise QuestionGenerationError("Gemini request could not be completed.") from exc
    except json.JSONDecodeError as exc:
        raise QuestionGenerationError("Gemini response was not valid JSON.") from exc

    parts = response_payload.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    raw_text = "".join(part.get("text", "") for part in parts).strip()
    if not raw_text:
        raise QuestionGenerationError("Gemini did not return question content.")

    try:
        content = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise QuestionGenerationError("Gemini question content was not valid JSON.") from exc

    prompt_text = str(content.get("prompt", "")).strip()
    explanation = str(content.get("explanation", "")).strip()
    raw_options = content.get("options", [])

    options = []
    for index, option in enumerate(raw_options, start=1):
        if not isinstance(option, dict):
            continue
        option_text = str(option.get("option_text", "")).strip()
        if not option_text:
            continue
        options.append(
            {
                "option_text": option_text,
                "is_correct": bool(option.get("is_correct")),
                "display_order": int(option.get("display_order") or index),
            }
        )

    if not prompt_text:
        raise QuestionGenerationError("Gemini did not return a valid prompt.")

    return {
        "prompt": prompt_text,
        "explanation": explanation,
        "options": options,
    }
