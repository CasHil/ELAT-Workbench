import gzip
import json

def extract_all_user_ids(log_files):
    """
    Extract all unique user_ids from the provided log files.
    """
    user_ids = set()
    for log_file in log_files:
        with gzip.open(log_file, 'rt', encoding='utf-8') as f:
            for line in f:
                try:
                    data = json.loads(line)
                    user_id = data.get("context", {}).get("user_id", "")
                    if user_id:
                        user_ids.add(user_id)
                except json.JSONDecodeError:
                    continue
    return user_ids

with open('user_profiles.json', 'r', encoding='utf-8') as json_file:
    user_profiles = json.load(json_file)

log_files = [
    'delftx-edx-events-2018-12-15.log.gz',
    'delftx-edx-events-2018-12-14.log.gz',
    'delftx-edx-events-2018-12-13.log.gz',
    'delftx-edx-events-2018-12-12.log.gz',
    'delftx-edx-events-2018-12-11.log.gz',
    'delftx-edx-events-2018-12-10.log.gz',
    'delftx-edx-events-2018-12-09.log.gz',
    'delftx-edx-events-2018-12-08.log.gz'
]
log_files = [f'W:/staff-umbrella/gdicsmoocs/Working copy/EX101x_2T2018_run6 - Copy/{log_file}' for log_file in log_files]

all_user_ids_from_logs = extract_all_user_ids(log_files)

filtered_profiles = [
    profile for profile in user_profiles
    if profile['gender'] in ['m', 'f'] and profile['hash_id'] in all_user_ids_from_logs
]

for profile in filtered_profiles:
    if profile['gender'] == 'm':
        profile['segment'] = 'A'
    elif profile['gender'] == 'f':
        profile['segment'] = 'B'
    else:
        profile['segment'] = None

hash_ids_filtered = set(profile['hash_id'] for profile in filtered_profiles)

for idx, log_file in enumerate(log_files):
    filtered_lines = []
    with gzip.open(log_file, 'rt', encoding='utf-8') as f:
        for line in f:
            try:
                data = json.loads(line)
                user_id = data.get("context", {}).get("user_id", "")
                if user_id in hash_ids_filtered:
                    filtered_lines.append(line)
            except json.JSONDecodeError:
                continue
    
    if filtered_lines:
        output_file_name = f'{idx + 1}_filtered.log.gz'
        new_file_path = f'W:/staff-umbrella/gdicsmoocs/Working copy/EX101x_2T2018_run6 - Copy/{output_file_name}'
        with gzip.open(new_file_path, 'wt', encoding='utf-8') as outfile:
            outfile.writelines(filtered_lines)

with open('filtered_user_profiles.json', 'w', encoding='utf-8') as outfile:
    json.dump(filtered_profiles, outfile, ensure_ascii=False, indent=4)
