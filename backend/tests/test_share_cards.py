from PIL import Image, ImageDraw

from app.services import share_cards


def test_centered_text_origin_accounts_for_font_bbox_offsets() -> None:
    image = Image.new("RGBA", (share_cards.CARD_WIDTH, 220), "#000000")
    draw = ImageDraw.Draw(image)
    font = share_cards._font(36, bold=True)
    text = "FOIL EPIC"
    center = (share_cards.CARD_WIDTH // 2, 110)
    text_box = draw.textbbox((0, 0), text, font=font)

    origin = share_cards._centered_text_origin(draw, text, center, font)

    visual_center_x = origin[0] + (text_box[0] + text_box[2]) / 2
    visual_center_y = origin[1] + (text_box[1] + text_box[3]) / 2
    assert visual_center_x == center[0]
    assert visual_center_y == center[1]


def test_attribute_value_font_shrinks_before_truncating_common_label() -> None:
    image = Image.new("RGBA", (share_cards.CARD_WIDTH, 220), "#000000")
    draw = ImageDraw.Draw(image)

    font = share_cards._fit_value_font(draw, "Игровая комната", 244)

    assert draw.textlength("Игровая комната", font=font) <= 244
    assert font.size < 32


def test_attribute_layout_stacks_rows_with_room_for_long_values() -> None:
    boxes = share_cards._attribute_row_boxes(5)

    assert len(boxes) == 5
    assert all(box[0] == boxes[0][0] for box in boxes)
    assert all(box[2] == boxes[0][2] for box in boxes)
    assert boxes[0][2] - boxes[0][0] >= 840
    assert all(boxes[index][3] < boxes[index + 1][1] for index in range(4))
