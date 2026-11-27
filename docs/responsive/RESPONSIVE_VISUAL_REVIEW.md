# Responsive visual review (turn 5)

Reviewed screenshots: `docs/radio-page/*.png` (320, 390, 768, 1440) and `docs/business-radio-redesign/*.png` (directory 320/390/768/1440, empty state, profile 320/390/1440, long-name profile). Earlier route shots are in `docs/route-audit/turn4/`.

- **320 px:** single column everywhere. Long business names wrap onto 3–4 lines with no truncation, and chip rows scroll horizontally inside their own box.
- **390–430 px:** directory cards stack; the profile shows identity, contact actions, then the info cards. The radio hero buttons stack.
- **768 px:** the directory grid becomes 2 columns, and the radio band is still stacked with a full-width player.
- **1440 px:** the directory grid becomes 3 columns with the featured row; the radio band is two-column. A profile with no description shows the info cards in one row instead of an empty column.
- **Full-page capture artifact:** fixed elements (Support) are drawn at their first-viewport position, so in tall shots they look mid-page. This is not a layout bug.
