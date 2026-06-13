import os
import sys

INPUT = os.path.abspath('output/skynet-nidhi-prayas-deck-polished.pptx')
OUTPUT = os.path.abspath('output/skynet-nidhi-prayas-deck.pdf')

try:
    import comtypes.client
except Exception as e:
    print('comtypes not available:', e)
    print('Cannot export to PDF programmatically. Please export manually in PowerPoint or install comtypes and run again.')
    sys.exit(2)

try:
    powerpoint = comtypes.client.CreateObject('Powerpoint.Application')
    powerpoint.Visible = 1
    presentation = powerpoint.Presentations.Open(INPUT)
    # 32 = ppSaveAsPDF
    presentation.SaveAs(OUTPUT, 32)
    presentation.Close()
    powerpoint.Quit()
    print('Saved PDF to', OUTPUT)
except Exception as e:
    print('Failed to export PDF via PowerPoint COM:', e)
    print('If running headless, open the PPTX in PowerPoint and Save As -> PDF manually.')
    sys.exit(3)
