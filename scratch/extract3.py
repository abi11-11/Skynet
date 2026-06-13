import pdfplumber
with pdfplumber.open(r"d:\abi\skynet\output\Skynet Professional Pitch Deck.pdf") as pdf:
    for i, page in enumerate(pdf.pages):
        text = page.extract_text()
        print(f"Page {i+1}:")
        print(text)
        print()
