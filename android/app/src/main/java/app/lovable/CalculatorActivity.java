
package app.lovable;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;

public class CalculatorActivity extends AppCompatActivity {
    private TextView display;
    private StringBuilder currentInput = new StringBuilder();
    private String operator = "";
    private double firstOperand = 0;
    private boolean isNewCalculation = true;
    private int secretSequenceCount = 0;
    private final String SECRET_SEQUENCE = "1337";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_calculator);
        
        initializeViews();
        setupButtonListeners();
    }
    
    private void initializeViews() {
        display = findViewById(R.id.calculator_display);
        display.setText("0");
    }
    
    private void setupButtonListeners() {
        // Number buttons
        int[] numberButtonIds = {
            R.id.btn_0, R.id.btn_1, R.id.btn_2, R.id.btn_3, R.id.btn_4,
            R.id.btn_5, R.id.btn_6, R.id.btn_7, R.id.btn_8, R.id.btn_9
        };
        
        for (int i = 0; i < numberButtonIds.length; i++) {
            final int number = i;
            Button button = findViewById(numberButtonIds[i]);
            button.setOnClickListener(v -> onNumberClick(String.valueOf(number)));
        }
        
        // Operator buttons
        findViewById(R.id.btn_plus).setOnClickListener(v -> onOperatorClick("+"));
        findViewById(R.id.btn_minus).setOnClickListener(v -> onOperatorClick("-"));
        findViewById(R.id.btn_multiply).setOnClickListener(v -> onOperatorClick("×"));
        findViewById(R.id.btn_divide).setOnClickListener(v -> onOperatorClick("÷"));
        findViewById(R.id.btn_equals).setOnClickListener(v -> onEqualsClick());
        findViewById(R.id.btn_clear).setOnClickListener(v -> onClearClick());
        findViewById(R.id.btn_decimal).setOnClickListener(v -> onDecimalClick());
    }
    
    private void onNumberClick(String number) {
        checkSecretSequence(number);
        
        if (isNewCalculation) {
            currentInput.setLength(0);
            isNewCalculation = false;
        }
        
        currentInput.append(number);
        display.setText(currentInput.toString());
    }
    
    private void checkSecretSequence(String input) {
        // Check for secret access sequence
        if (currentInput.toString().endsWith(SECRET_SEQUENCE.substring(0, secretSequenceCount)) &&
            SECRET_SEQUENCE.charAt(secretSequenceCount) == input.charAt(0)) {
            secretSequenceCount++;
            
            if (secretSequenceCount >= SECRET_SEQUENCE.length()) {
                // Secret sequence complete - open real vault
                openVaultApp();
                secretSequenceCount = 0;
            }
        } else {
            secretSequenceCount = 0;
        }
    }
    
    private void openVaultApp() {
        // Launch the real vault app
        android.content.Intent intent = new android.content.Intent(this, MainActivity.class);
        intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK | android.content.Intent.FLAG_ACTIVITY_CLEAR_TASK);
        startActivity(intent);
        finish();
    }
    
    private void onOperatorClick(String op) {
        if (currentInput.length() > 0) {
            firstOperand = Double.parseDouble(currentInput.toString());
            operator = op;
            isNewCalculation = true;
        }
    }
    
    private void onEqualsClick() {
        if (currentInput.length() > 0 && !operator.isEmpty()) {
            double secondOperand = Double.parseDouble(currentInput.toString());
            double result = performCalculation(firstOperand, secondOperand, operator);
            
            display.setText(formatResult(result));
            currentInput.setLength(0);
            currentInput.append(formatResult(result));
            operator = "";
            isNewCalculation = true;
        }
    }
    
    private double performCalculation(double first, double second, String op) {
        switch (op) {
            case "+": return first + second;
            case "-": return first - second;
            case "×": return first * second;
            case "÷": return second != 0 ? first / second : 0;
            default: return 0;
        }
    }
    
    private String formatResult(double result) {
        if (result == (long) result) {
            return String.valueOf((long) result);
        } else {
            return String.valueOf(result);
        }
    }
    
    private void onClearClick() {
        currentInput.setLength(0);
        display.setText("0");
        operator = "";
        firstOperand = 0;
        isNewCalculation = true;
        secretSequenceCount = 0;
    }
    
    private void onDecimalClick() {
        if (isNewCalculation) {
            currentInput.setLength(0);
            currentInput.append("0");
            isNewCalculation = false;
        }
        
        if (!currentInput.toString().contains(".")) {
            currentInput.append(".");
            display.setText(currentInput.toString());
        }
    }
}
