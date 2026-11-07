CXX ?= g++
CXXFLAGS = -std=c++14 -Wall -Wextra -O2 -Iinclude -Iinclude/external
WIN_CXX = x86_64-w64-mingw32-g++

SRC = src/HashTable.cpp src/Trie.cpp src/MaxHeap.cpp src/Graph.cpp src/Algorithms.cpp
MAIN_SRC = src/main.cpp $(SRC)
TEST_SRC = tests/test_dsa.cpp $(SRC)

BIN_DIR = bin

all: $(BIN_DIR)/modelmind_engine $(BIN_DIR)/test_dsa

$(BIN_DIR)/modelmind_engine: $(MAIN_SRC)
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $(MAIN_SRC)
	@echo "Built Linux C++ Engine: $@"

$(BIN_DIR)/test_dsa: $(TEST_SRC)
	@mkdir -p $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $(TEST_SRC)
	@echo "Built C++ DSA Test Runner: $@"

test: $(BIN_DIR)/test_dsa
	./$(BIN_DIR)/test_dsa

windows:
	@mkdir -p $(BIN_DIR)
	@if which $(WIN_CXX) > /dev/null 2>&1; then \
		$(WIN_CXX) $(CXXFLAGS) -static -o $(BIN_DIR)/modelmind_engine.exe $(MAIN_SRC) && \
		echo "Cross-compiled Windows Binary: $(BIN_DIR)/modelmind_engine.exe"; \
	else \
		echo "MinGW cross-compiler ($(WIN_CXX)) not installed in container. On native Windows, run build.bat."; \
	fi

clean:
	rm -rf $(BIN_DIR)

.PHONY: all test windows clean
