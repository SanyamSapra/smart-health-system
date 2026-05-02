import DiseasePredictionTool from "../../components/disease/DiseasePredictionTool";

const DiseasePrediction = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <p className="text-xs font-medium text-gray-400">Clinical screening support</p>
          <h1 className="mt-1 text-xl font-bold text-gray-800">Disease Prediction</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Select symptoms, add context, and review ranked predictions with matched symptoms and risk signals.
          </p>
        </div>

        <DiseasePredictionTool />
      </div>
    </div>
  );
};

export default DiseasePrediction;
