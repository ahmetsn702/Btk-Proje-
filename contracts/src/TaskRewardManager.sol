// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "./CategoryPoints1155.sol";

/**
 * @title TaskRewardManager
 * @notice Görev tamamlama ödüllerini batch mint ile dağıtan kontrat.
 *         Geliştirici 1'in backend'i bu kontratı çağırır (MINTER_ROLE gerekir).
 */
contract TaskRewardManager is AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /// @notice CP mint edilecek hedef kontrat
    CategoryPoints1155 public cpToken;

    enum TaskType {
        ProductReview,
        SocialShare,
        Survey,
        Quiz,
        Referral
    }

    struct TaskCompletion {
        TaskType taskType;
        address user;
        uint256 categoryId;
        uint256 amount;
        uint256 timestamp;
        string metadata; // JSON string or IPFS hash
    }

    /// @notice Görev tamamlama logları
    TaskCompletion[] public completions;

    /// @notice Kullanıcı başına tamamlanan görev sayısı
    mapping(address => uint256) public userTaskCount;

    /// @notice Görev tipi başına ödül miktarı (default)
    mapping(TaskType => uint256) public defaultReward;

    event TaskCompleted(
        uint256 indexed completionId,
        TaskType indexed taskType,
        address indexed user,
        uint256 categoryId,
        uint256 amount,
        uint256 timestamp,
        string metadata
    );

    event BatchMinted(
        uint256 indexed categoryId,
        address[] recipients,
        uint256[] amounts
    );

    event RewardUpdated(TaskType indexed taskType, uint256 newAmount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address admin_, address cpTokenAddress_) external initializer {
        __AccessControl_init();
        __Pausable_init();

        cpToken = CategoryPoints1155(cpTokenAddress_);

        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(UPGRADER_ROLE, admin_);
        _grantRole(PAUSER_ROLE, admin_);

        // Default rewards (can be updated by admin)
        defaultReward[TaskType.ProductReview] = 100 * 1e18;
        defaultReward[TaskType.SocialShare] = 50 * 1e18;
        defaultReward[TaskType.Survey] = 150 * 1e18;
        defaultReward[TaskType.Quiz] = 200 * 1e18;
        defaultReward[TaskType.Referral] = 500 * 1e18;
    }

    /**
     * @notice Tek bir görev tamamlama kaydı oluşturur ve CP mint eder.
     *         Sadece MINTER_ROLE sahibi (Geliştirici 1 backend) çağırabilir.
     */
    function completeTask(
        TaskType taskType,
        address user,
        uint256 categoryId,
        string calldata metadata
    ) external whenNotPaused onlyRole(cpToken.MINTER_ROLE()) {
        uint256 amount = defaultReward[taskType];
        require(amount > 0, "TRM: reward not set");

        uint256 completionId = completions.length;
        completions.push(TaskCompletion({
            taskType: taskType,
            user: user,
            categoryId: categoryId,
            amount: amount,
            timestamp: block.timestamp,
            metadata: metadata
        }));

        userTaskCount[user]++;

        // Mint CP to user
        cpToken.mint(user, categoryId, amount);

        emit TaskCompleted(completionId, taskType, user, categoryId, amount, block.timestamp, metadata);
    }

    /**
     * @notice Toplu CP mint — gas optimizasyonu için.
     *         Sadece MINTER_ROLE sahibi çağırabilir.
     */
    function batchMint(
        uint256 categoryId,
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external whenNotPaused onlyRole(cpToken.MINTER_ROLE()) {
        require(recipients.length == amounts.length, "TRM: array length mismatch");
        require(recipients.length > 0, "TRM: empty batch");

        for (uint256 i = 0; i < recipients.length; i++) {
            cpToken.mint(recipients[i], categoryId, amounts[i]);
        }

        emit BatchMinted(categoryId, recipients, amounts);
    }

    /**
     * @notice Görev tipi başına varsayılan ödülü günceller.
     */
    function setDefaultReward(TaskType taskType, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultReward[taskType] = amount;
        emit RewardUpdated(taskType, amount);
    }

    /**
     * @notice CP kontrat adresini günceller (upgrade senaryosu).
     */
    function setCpToken(address cpTokenAddress_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        cpToken = CategoryPoints1155(cpTokenAddress_);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControlUpgradeable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
