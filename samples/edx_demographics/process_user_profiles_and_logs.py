# import gzip
# import json
# import os

# # This script adds segments to user profiles based on their gender ('m', 'f'), and filters the logs to only include users from these segments.
# def extract_all_user_ids(log_files):
#     user_ids = set()
#     for log_file in log_files:
#         print("Extracting user_ids from", log_file)
#         with gzip.open(log_file, 'rt', encoding='utf-8') as f:
#             for line in f:
#                 try:
#                     data = json.loads(line)
#                     user_id = data.get("context", {}).get("user_id", "")
#                     if user_id:
#                         user_ids.add(user_id)
#                 except json.JSONDecodeError:
#                     continue
#     return user_ids

# def find_log_files(base_path, prefixes):
#     log_files = []
#     for root, dirs, files in os.walk(base_path):
#         for file in files:
#             if file.endswith(".log.gz") and any(root.split(os.sep)[-1].startswith(prefix) for prefix in prefixes):
#                 log_files.append(os.path.join(root, file))
#     return log_files

# base_path = 'W:/staff-umbrella/gdicsmoocs/Working copy'
# # prefixes = ["EX101x", "ST1x", "UnixTx", "FP101x"]
# prefixes = ["UnixTx"]

# with open('user_profiles.json', 'r', encoding='utf-8') as json_file:
#     user_profiles = json.load(json_file)

# print("Finding log files...")
# log_files = find_log_files(base_path, prefixes)

# print("Extracting user ids from logs...")
# all_user_ids_from_logs = extract_all_user_ids(log_files)

# print("Filtering user profiles...")
# filtered_profiles = [
#     profile for profile in user_profiles
#     if profile['gender'] in ['m', 'f'] and profile['hash_id'] in all_user_ids_from_logs
# ]

# print("Adding segments to user profiles...")
# for profile in filtered_profiles:
#     if profile['gender'] == 'm':
#         profile['segment'] = 'A'
#     elif profile['gender'] == 'f':
#         profile['segment'] = 'B'

# hash_ids_filtered = set(profile['hash_id'] for profile in filtered_profiles)

# # print("Filtering log files...")
# # for log_file in log_files:
# #     print("Processing", log_file)
# #     filtered_lines = []
# #     with gzip.open(log_file, 'rt', encoding='utf-8') as f:
# #         for line in f:
# #             try:
# #                 data = json.loads(line)
# #                 user_id = data.get("context", {}).get("user_id", "")
# #                 if user_id in hash_ids_filtered:
# #                     filtered_lines.append(line)
# #             except json.JSONDecodeError:
# #                 continue
    
# #     if filtered_lines:
# #         processed_dir = os.path.join(os.path.dirname(log_file), 'processed')
# #         os.makedirs(processed_dir, exist_ok=True)
# #         processed_file_path = os.path.join(processed_dir, os.path.basename(log_file))
# #         with gzip.open(processed_file_path, 'wt', encoding='utf-8') as outfile:
# #             outfile.writelines(filtered_lines)

# with open('filtered_user_profiles.json', 'w', encoding='utf-8') as outfile:
#     json.dump(filtered_profiles, outfile, ensure_ascii=False, indent=4)


import gzip
import json
import os
from dotenv import load_dotenv

load_dotenv()

WORKING_DIRECTORY = os.getenv('WORKING_DIRECTORY')
COURSES = ['EX101x', 'ST1x', 'UnixTx', 'FP101x']

def find_course_runs() -> set[str]:
    course_runs = set()
    for root, dirs, files in os.walk(WORKING_DIRECTORY):
        if 'processed' in root.split(os.sep):
            continue  # Skip directories named "processed"
        for dir_name in dirs:
            if any(dir_name.startswith(course) for course in COURSES) and dir_name != 'processed':
                course_runs.add(dir_name)
    return course_runs

def process_course_run(course_run: str, user_profiles: str) -> None:
    user_ids = set()
    course_run_path = os.path.join(WORKING_DIRECTORY, course_run)
    for root, _, files in os.walk(course_run_path):
        if 'processed' in root.split(os.sep):
            continue
        for file in files:
            if file.endswith(".log.gz"):
                log_file_path = os.path.join(root, file)
                print(f"Extracting user_ids from {log_file_path}")
                with gzip.open(log_file_path, 'rt', encoding='utf-8') as f:
                    for line in f:
                        try:
                            data = json.loads(line)
                            user_id = data.get("context", {}).get("user_id", "")
                            if user_id:
                                user_ids.add(user_id)
                        except json.JSONDecodeError:
                            continue

    filtered_profiles = [
        profile for profile in user_profiles
        if profile['gender'] in ['m', 'f'] and profile['hash_id'] in user_ids
    ]

    for profile in filtered_profiles:
        profile['segment'] = 'A' if profile['gender'] == 'm' else 'B'

    file_name = f"{course_run}.json"
    with open(file_name, 'w', encoding='utf-8') as outfile:
        json.dump(filtered_profiles, outfile, ensure_ascii=False, indent=4)
        print(f"Created {file_name} with {len(filtered_profiles)} profiles")

def main():
    with open('user_profiles.json', 'r', encoding='utf-8') as json_file:
        user_profiles = json.load(json_file)

    course_runs = find_course_runs()
    for course_run in course_runs:
        process_course_run(course_run, user_profiles)

main()
