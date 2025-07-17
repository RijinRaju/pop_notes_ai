from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

model_name = "google/flan-t5-small"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
model.eval()  # Set to evaluation mode

# Example input
input_text = "Translate English to French: Hello, how are you?"
inputs = tokenizer(input_text, return_tensors="pt")

# Prepare decoder inputs (required for seq2seq models)
decoder_input_ids = torch.ones((1, 1), dtype=torch.long) * model.config.decoder_start_token_id

# Create a wrapper class for proper export
class T5Wrapper(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
    
    def forward(self, input_ids, attention_mask, decoder_input_ids):
        return self.model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            decoder_input_ids=decoder_input_ids,
            return_dict=False
        )[0]  # Only return logits

# Wrap the model
wrapped_model = T5Wrapper(model)

# Export to ONNX
torch.onnx.export(
    wrapped_model,
    (inputs["input_ids"], inputs["attention_mask"], decoder_input_ids),
    "flan-t5-small.onnx",
    input_names=["input_ids", "attention_mask", "decoder_input_ids"],
    output_names=["logits"],
    dynamic_axes={
        "input_ids": {0: "batch", 1: "sequence"},
        "attention_mask": {0: "batch", 1: "sequence"},
        "decoder_input_ids": {0: "batch", 1: "sequence"},
        "logits": {0: "batch", 1: "sequence"},
    },
    opset_version=15,
    do_constant_folding=True,
    export_params=True,
    verbose=True,
)

print("ONNX export successful!")