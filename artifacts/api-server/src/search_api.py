import os

filepath = r"c:\Users\admin\Downloads\Web-Asset-Manager\Web-Asset-Manager\lib\api-client-react\src\generated\api.ts"

with open(filepath, "r", encoding="utf-8") as f:
    lines = f.readlines()

for idx, line in enumerate(lines):
    if "createTicket" in line or "useCreateTicket" in line:
        start = max(0, idx - 10)
        end = min(len(lines), idx + 25)
        print(f"--- MATCH AT LINE {idx + 1} ---")
        for i in range(start, end):
            print(f"{i + 1}: {lines[i]}", end="")
