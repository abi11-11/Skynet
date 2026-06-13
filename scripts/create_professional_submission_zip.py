import zipfile

files = [
    'output/skynet-nidhi-prayas-deck-professional.pptx',
    'output/planning-artifacts/grants/nidhi-prayas/team-and-eligibility.md',
    'output/planning-artifacts/grants/nidhi-prayas/prototype-spec.md',
    'output/planning-artifacts/grants/nidhi-prayas/nidhi-prayas-budget.csv'
]

with zipfile.ZipFile('output/skynet-nidhi-prayas-submission-professional.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(f)

print('Created output/skynet-nidhi-prayas-submission-professional.zip')
