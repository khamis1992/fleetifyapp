import re
import sys
from pathlib import Path

from pglast import parse_sql
from pglast.parser import parse_plpgsql_json


path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
parse_sql(text)

delimiter = re.escape("$$")
functions = re.findall(
    r"CREATE OR REPLACE FUNCTION.*?" + delimiter + r";",
    text,
    re.IGNORECASE | re.DOTALL,
)

for index, statement in enumerate(functions, start=1):
    name = re.search(r"FUNCTION\s+([^\s(]+)", statement, re.IGNORECASE)
    label = name.group(1) if name else f"function-{index}"
    try:
        parse_plpgsql_json(statement)
    except Exception as error:
        print(f"{label}: {error}")
        raise
    print(f"{label}: parsed")
